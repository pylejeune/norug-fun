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
            let cat: any;
            if (category) {
                switch (category.toLowerCase()) {
                    case 'marketing': cat = { marketing: {} }; break;
                    case 'team': cat = { team: {} }; break;
                    case 'operations': cat = { operations: {} }; break;
                    case 'investments': cat = { investments: {} }; break;
                    case 'crank': cat = { crank: {} }; break;
                    default: throw new Error(`Unknown category: ${category}`);
                }
            }
            switch (role.toLowerCase()) {
                case 'admin': return { admin: {} };
                case 'categorymanager': return { categoryManager: cat };
                case 'withdrawer': return { withdrawer: cat };
                default: throw new Error(`Unknown role: ${role}`);
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
            console.log(`  [UpdateTreasuryRoleTests] Context acquired. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)}`);
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
            const updatedRole = accountInfo.roles.find(r => r.pubkey.equals(userWithRole.publicKey) && JSON.stringify(r.roleType) === JSON.stringify(roleToUpdate));
            expect(updatedRole).to.exist;
            expect(updatedRole?.withdrawalLimit?.eq(newLimit)).to.be.true;
            expect(updatedRole?.withdrawalPeriod?.eq(newPeriod)).to.be.true;
            console.log(`  [UpdateTreasuryRoleTests] Role updated with new limit and period.`);
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
            console.log(`  [UpdateTreasuryRoleTests] withdrawalLimit set to null.`);

            // Mettre à jour seulement la période à null
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, initialLimit, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            updatedRole = accountInfo.roles[0];
            expect(updatedRole.withdrawalLimit?.eq(initialLimit)).to.be.true;
            expect(updatedRole.withdrawalPeriod).to.be.null;
            console.log(`  [UpdateTreasuryRoleTests] withdrawalPeriod set to null.`);

             // Mettre les deux à null
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, null, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            updatedRole = accountInfo.roles[0];
            expect(updatedRole.withdrawalLimit).to.be.null;
            expect(updatedRole.withdrawalPeriod).to.be.null;
            console.log(`  [UpdateTreasuryRoleTests] Both withdrawalLimit and withdrawalPeriod set to null.`);
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
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('RoleNotFound');
                console.log(`  [UpdateTreasuryRoleTests] Correctly failed for non-existent user.`);
            }
            
            try {
                await program.methods.updateTreasuryRole(nonExistentRoleType, userWithRole.publicKey, newLimit, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [UpdateTreasuryRoleTests] Should have failed to update non-existent role type for user.');
            } catch (error) {
                 expect((error as anchor.AnchorError).error.errorCode.code).to.equal('RoleNotFound');
                console.log(`  [UpdateTreasuryRoleTests] Correctly failed for non-existent role type.`);
            }
        });

        it('should not modify other properties of the role (pubkey, roleType)', async () => {
            const newLimit = new anchor.BN(3000);
            await program.methods.updateTreasuryRole(roleToUpdate, userWithRole.publicKey, newLimit, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            const updatedRole = accountInfo.roles[0];
            expect(updatedRole.pubkey.equals(userWithRole.publicKey)).to.be.true;
            expect(JSON.stringify(updatedRole.roleType)).to.equal(JSON.stringify(roleToUpdate));
            console.log(`  [UpdateTreasuryRoleTests] pubkey and roleType remained unchanged after update.`);
        });
    });
} 