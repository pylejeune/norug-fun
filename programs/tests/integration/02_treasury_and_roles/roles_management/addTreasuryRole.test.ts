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

export function runAddTreasuryRoleTests() {
    describe('Instruction: add_treasury_role', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let treasuryRolesPda: PublicKey;
        let userForKey: Keypair;
        let nonAdminSigner: Keypair;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;
            userForKey = Keypair.generate();
            nonAdminSigner = Keypair.generate();
            [treasuryRolesPda] = getTreasuryRolesPda(program.programId);

            await ensureProgramConfigInitialized(ctx);
            await ensureTreasuryInitialized(ctx);
            // ensureTreasuryRolesInitialized sera appelé dans beforeEach pour un état propre.
            console.log(`  [AddTreasuryRoleTests] Context acquired. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)}`);
        });

        beforeEach(async () => {
            // Réinitialiser TreasuryRoles avec seulement adminKeypair et aucun rôle.
            await ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey], true); // true pour clearRoles
            ctx.treasuryRolesAddress = treasuryRolesPda;
            const info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.roles.length).to.equal(0);
            // console.log(`  [AddTreasuryRoleTests] beforeEach: TreasuryRoles reset with admin ${shortenAddress(adminKeypair.publicKey)} and 0 roles.`);
        });

        // Helper pour construire RoleType et TreasuryCategory pour les tests
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
                    return { categoryManager: { "0": catEnumValue } }; // Structure correcte pour enum Rust avec tuple
                case 'withdrawer': 
                    if (!catEnumValue) throw new Error('Withdrawer requires a category');
                    return { withdrawer: { "0": catEnumValue } }; // Structure correcte pour enum Rust avec tuple
                default: 
                    throw new Error(`Unknown role: ${role}`);
            }
        };

        it('should allow an admin to add a CategoryManager role', async () => {
            const roleToAdd = getRoleType('CategoryManager', 'Marketing');
            
            await program.methods.addTreasuryRole(roleToAdd, userForKey.publicKey, null, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair])
                .rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(accountInfo.roles.length).to.equal(1);
            const addedRole = accountInfo.roles[0];
            expect(addedRole.pubkey.equals(userForKey.publicKey)).to.be.true;
            expect(JSON.stringify(addedRole.roleType)).to.equal(JSON.stringify(roleToAdd));
            console.log(`  [AddTreasuryRoleTests] CategoryManager for Marketing added to ${shortenAddress(userForKey.publicKey)}.`);
        });

        it('should allow an admin to add a Withdrawer role with limits', async () => {
            const roleToAdd = getRoleType('Withdrawer', 'Team');
            const limit = new anchor.BN(1000);
            const period = new anchor.BN(3600);

            await program.methods.addTreasuryRole(roleToAdd, userForKey.publicKey, limit, period)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair])
                .rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(accountInfo.roles.length).to.equal(1);
            const addedRole = accountInfo.roles[0];
            expect(addedRole.pubkey.equals(userForKey.publicKey)).to.be.true;
            expect(JSON.stringify(addedRole.roleType)).to.equal(JSON.stringify(roleToAdd));
            expect(addedRole.withdrawalLimit?.eq(limit)).to.be.true;
            expect(addedRole.withdrawalPeriod?.eq(period)).to.be.true;
            console.log(`  [AddTreasuryRoleTests] Withdrawer for Team with limits added to ${shortenAddress(userForKey.publicKey)}.`);
        });

        it('should fail if signer is not an admin', async () => {
            const roleToAdd = getRoleType('CategoryManager', 'Operations');
            try {
                await program.methods.addTreasuryRole(roleToAdd, userForKey.publicKey, null, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: nonAdminSigner.publicKey })
                    .signers([nonAdminSigner])
                    .rpc();
                expect.fail('  [AddTreasuryRoleTests] Transaction should have failed as signer is not admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [AddTreasuryRoleTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should fail to add a role that already exists for the same user and type', async () => {
            const roleToAdd = getRoleType('Withdrawer', 'Investments');
            await program.methods.addTreasuryRole(roleToAdd, userForKey.publicKey, null, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            console.log(`  [AddTreasuryRoleTests] Role added once for duplicate test.`);

            try {
                await program.methods.addTreasuryRole(roleToAdd, userForKey.publicKey, null, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [AddTreasuryRoleTests] Transaction should have failed as role already exists.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('RoleAlreadyExists');
                console.log(`  [AddTreasuryRoleTests] Correctly failed due to RoleAlreadyExists.`);
            }
        });
        
        it('should be able to add roles up to the capacity (5)', async () => {
            const rolesToAdd = 4; // Max 4 roles, car la condition est < 5 dans le programme
            for (let i = 0; i < rolesToAdd; i++) {
                const tempUser = Keypair.generate();
                // Alterner les types de rôle et catégories pour la diversité
                const roleTypeStr = i % 2 === 0 ? 'CategoryManager' : 'Withdrawer';
                const categoryStr = ['Marketing', 'Team', 'Operations', 'Investments', 'Crank'][i % 5];
                const role = getRoleType(roleTypeStr, categoryStr);
                await program.methods.addTreasuryRole(role, tempUser.publicKey, null, null)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair])
                    .rpc();
                // console.log(`    Added role ${i + 1} for ${shortenAddress(tempUser.publicKey)}`);
            }
            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(accountInfo.roles.length).to.equal(rolesToAdd);
            console.log(`  [AddTreasuryRoleTests] Successfully added ${rolesToAdd} roles.`);
        });
    });
} 