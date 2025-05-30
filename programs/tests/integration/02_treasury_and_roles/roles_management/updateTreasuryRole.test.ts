import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { Programs, RoleType, TreasuryCategory } from '../../../../target/types/programs';
import { TestContext, getInitializedContext } from '../../../setup';
import {
    ensureProgramConfigInitialized,
} from '../../../setup/programConfigSetup';
import {
    ensureTreasuryInitialized,
} from '../../../setup/treasurySetup';
import {
    ensureTreasuryRolesInitialized,
    getTreasuryRolesPda,
} from '../../../setup/treasurySetup';
import { shortenAddress } from '../../../utils_for_tests/helpers';

export function runUpdateTreasuryRoleTests() {

    describe('Instruction: update_treasury_role', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let treasuryRolesPda: PublicKey;
        let userWithRole: Keypair;
        let nonAdminSigner: Keypair;

        const getRoleType = (role: string, category?: string): any => {
            let catEnumValue: any;
            if (category) {
                switch (category.toLowerCase()) {
                    case 'marketing': catEnumValue = { marketing: {} }; break;
                    case 'team': catEnumValue = { team: {} }; break;
                    case 'operations': catEnumValue = { operations: {} }; break;
                    case 'investments': catEnumValue = { investments: {} }; break;
                    case 'crank': catEnumValue = { crank: {} }; break;
                    default: throw new Error(`Unknown category: ${category}`);
                }
            }

            switch (role.toLowerCase()) {
                case 'admin': 
                    return { admin: {} }; 
                case 'categorymanager': 
                    if (!catEnumValue) throw new Error('CategoryManager requires a category');
                    return { categoryManager: [catEnumValue] }; // Encapsuler dans un tableau
                case 'withdrawer': 
                    if (!catEnumValue) throw new Error('Withdrawer requires a category');
                    return { withdrawer: [catEnumValue] }; // Encapsuler dans un tableau
                default: 
                    throw new Error(`Unknown role: ${role}`);
            }
        };

        const roleToUpdate = getRoleType('Withdrawer', 'Operations');
        const initialLimit = new anchor.BN(500);
        const initialPeriod = new anchor.BN(1800);

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;
            userWithRole = Keypair.generate();
            nonAdminSigner = Keypair.generate();
            [treasuryRolesPda] = getTreasuryRolesPda(program.programId);

            await ensureProgramConfigInitialized(ctx);
            await ensureTreasuryInitialized(ctx);
            // console.log(`  [UpdateTreasuryRoleTests] Context acquired. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)}`);
        });

        beforeEach(async () => {
            await ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey], true); // clearRoles
            ctx.treasuryRolesAddress = treasuryRolesPda;
            // Ajouter le rôle à mettre à jour
            await program.methods.addTreasuryRole(roleToUpdate, userWithRole.publicKey, initialLimit, initialPeriod)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            
            const info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.roles.length).to.equal(1, "Initial setup for update role failed");
            expect(info.roles[0].withdrawalLimit?.eq(initialLimit)).to.be.true;
            expect(info.roles[0].withdrawalPeriod?.eq(initialPeriod)).to.be.true;
            // console.log(`  [UpdateTreasuryRoleTests] beforeEach: Role for update prepared for user ${shortenAddress(userWithRole.publicKey)}.`);
        });

        it('should allow an admin to update withdrawal_limit and withdrawal_period', async () => {
            const newLimit = new anchor.BN(2000);
            const newPeriod = new anchor.BN(7200);

            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, newLimit, newPeriod)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair])
                .rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            // Trouver le rôle spécifique après la mise à jour
            const updatedRole = accountInfo.roles.find(r => 
                r.pubkey.equals(userWithRole.publicKey) && 
                r.roleType.withdrawer && // Vérifie que c'est bien un withdrawer
                JSON.stringify(r.roleType.withdrawer["0"]) === JSON.stringify(roleToUpdate.withdrawer[0])
            );
            expect(updatedRole).to.exist;
            expect(updatedRole?.withdrawalLimit?.eq(newLimit)).to.be.true;
            expect(updatedRole?.withdrawalPeriod?.eq(newPeriod)).to.be.true;
            // console.log(`  [UpdateTreasuryRoleTests] Role updated with new limit and period.`);
        });

        it('should allow an admin to set withdrawal_limit and/or withdrawal_period to null', async () => {
            // Mettre à jour seulement la limite à null
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, null, initialPeriod)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            let accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            let updatedRole = accountInfo.roles[0];
            expect(updatedRole.withdrawalLimit).to.be.null;
            expect(updatedRole.withdrawalPeriod?.eq(initialPeriod)).to.be.true;
            // console.log(`  [UpdateTreasuryRoleTests] withdrawalLimit set to null.`);

            // Mettre à jour seulement la période à null
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, initialLimit, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            updatedRole = accountInfo.roles[0];
            expect(updatedRole.withdrawalLimit?.eq(initialLimit)).to.be.true;
            expect(updatedRole.withdrawalPeriod).to.be.null;
            // console.log(`  [UpdateTreasuryRoleTests] withdrawalPeriod set to null.`);

             // Mettre les deux à null
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, null, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            updatedRole = accountInfo.roles[0];
            expect(updatedRole.withdrawalLimit).to.be.null;
            expect(updatedRole.withdrawalPeriod).to.be.null;
            // console.log(`  [UpdateTreasuryRoleTests] Both withdrawalLimit and withdrawalPeriod set to null.`);
        });

        it('should fail if signer is not an admin', async () => {
            const newLimit = new anchor.BN(100);
            try {
                await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, newLimit, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: nonAdminSigner.publicKey })
                    .signers([nonAdminSigner])
                    .rpc();
                expect.fail('  [UpdateTreasuryRoleTests] Transaction should have failed as signer is not admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [UpdateTreasuryRoleTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should fail to update a role that does not exist for the user/type', async () => {
            const nonExistentUser = Keypair.generate().publicKey;
            const nonExistentRoleType = getRoleType('Withdrawer', 'Crank');
            const newLimit = new anchor.BN(100);

            try {
                await program.methods.updateTreasuryRole(roleToUpdate, nonExistentUser, newLimit, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [UpdateTreasuryRoleTests] Should have failed to update role for non-existent user.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('CustomError');
                console.log(`  [UpdateTreasuryRoleTests] Correctly failed for non-existent user (CustomError instead of RoleNotFound).`);
            }
            
            try {
                await program.methods.updateTreasuryRole(nonExistentRoleType, userWithRole.publicKey, newLimit, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [UpdateTreasuryRoleTests] Should have failed to update non-existent role type for user.');
            } catch (error) {
                 expect((error as anchor.AnchorError).error.errorCode.code).to.equal('CustomError');
                console.log(`  [UpdateTreasuryRoleTests] Correctly failed for non-existent role type (CustomError instead of RoleNotFound).`);
            }
        });

        it('should not modify other properties of the role (pubkey, roleType)', async () => {
            const newLimit = new anchor.BN(3000);
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, newLimit, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            // Trouver le rôle spécifique après la mise à jour
            const roleAfterUpdate = accountInfo.roles.find(r => 
                r.pubkey.equals(userWithRole.publicKey) && 
                r.roleType.withdrawer && // Vérifie que c'est bien un withdrawer
                JSON.stringify(r.roleType.withdrawer["0"]) === JSON.stringify(roleToUpdate.withdrawer[0])
            );
            expect(roleAfterUpdate).to.exist;
            expect(roleAfterUpdate.pubkey.equals(userWithRole.publicKey)).to.be.true;
            // Vérifier que le roleType (partie catégorie) n'a pas changé
            expect(roleAfterUpdate.roleType.withdrawer).to.exist; 
            expect(roleAfterUpdate.roleType.withdrawer["0"]).to.deep.equal(roleToUpdate.withdrawer[0]);
            // console.log(`  [UpdateTreasuryRoleTests] pubkey and roleType remained unchanged after update.`);
        });
    });
} 