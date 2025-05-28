import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
import { expect } from 'chai';
import { Programs, RoleType, TreasuryCategory } from '../../../../target/types/programs'; // Assumer que RoleType et TreasuryCategory sont là
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

export function runRemoveTreasuryRoleTests() {

    describe('Instruction: remove_treasury_role', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair;
        let treasuryRolesPda: PublicKey;
        let userWithRole: Keypair;
        let nonAdminSigner: Keypair;

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
                    return { categoryManager: [catEnumValue] }; // Encapsuler dans un tableau
                case 'withdrawer': 
                    if (!catEnumValue) throw new Error('Withdrawer requires a category');
                    return { withdrawer: [catEnumValue] }; // Encapsuler dans un tableau
                default: 
                    throw new Error(`Unknown role: ${role}`);
            }
        };
        
        const roleToRemove = getRoleType('CategoryManager', 'Marketing');
        const anotherRole = getRoleType('Withdrawer', 'Team');

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;
            userWithRole = Keypair.generate();
            nonAdminSigner = Keypair.generate();
            [treasuryRolesPda] = getTreasuryRolesPda(program.programId);

            await ensureProgramConfigInitialized(ctx);
            await ensureTreasuryInitialized(ctx);
            // console.log(`  [RemoveTreasuryRoleTests] Context acquired. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)}`);
        });

        beforeEach(async () => {
            // Réinitialiser avec un admin et ajouter quelques rôles pour les tests
            await ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey], true); // true pour clearRoles
            ctx.treasuryRolesAddress = treasuryRolesPda;

            // Ajouter les rôles nécessaires pour les tests de suppression
            await program.methods.addTreasuryRole(roleToRemove, userWithRole.publicKey, null, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            await program.methods.addTreasuryRole(anotherRole, userWithRole.publicKey, null, null)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            
            const info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.roles.length).to.equal(2, "Initial setup for remove role failed");
            // console.log(`  [RemoveTreasuryRoleTests] beforeEach: TreasuryRoles reset with 2 roles for user ${shortenAddress(userWithRole.publicKey)}.`);
        });

        it('should allow an admin to remove an existing role', async () => {
            await program.methods.removeTreasuryRole(roleToRemove, userWithRole.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair])
                .rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(accountInfo.roles.length).to.equal(1);
            // Vérifier que le rôle spécifique a été supprimé
            const roleExists = accountInfo.roles.some(r => 
                r.pubkey.equals(userWithRole.publicKey) && 
                r.roleType.categoryManager && 
                JSON.stringify(r.roleType.categoryManager["0"]) === JSON.stringify(roleToRemove.categoryManager[0])
            );
            expect(roleExists).to.be.false;
            // Vérifier que l'autre rôle est toujours là
            const otherRoleExists = accountInfo.roles.some(r => 
                r.pubkey.equals(userWithRole.publicKey) && 
                r.roleType.withdrawer &&
                JSON.stringify(r.roleType.withdrawer["0"]) === JSON.stringify(anotherRole.withdrawer[0])
            );
            expect(otherRoleExists).to.be.true;
            // console.log(`  [RemoveTreasuryRoleTests] Role removed successfully. Remaining roles: ${accountInfo.roles.length}`);
        });

        it('should fail if signer is not an admin', async () => {
            try {
                await program.methods.removeTreasuryRole(roleToRemove, userWithRole.publicKey)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: nonAdminSigner.publicKey })
                    .signers([nonAdminSigner])
                    .rpc();
                expect.fail('  [RemoveTreasuryRoleTests] Transaction should have failed as signer is not admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [RemoveTreasuryRoleTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should succeed (be idempotent) when attempting to remove a non-existent role', async () => {
            const nonExistentRole = getRoleType('CategoryManager', 'Crank');
            const nonExistentUser = Keypair.generate().publicKey;
            
            let infoBefore = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            const countBefore = infoBefore.roles.length;

            try {
                await program.methods.removeTreasuryRole(nonExistentRole, nonExistentUser)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair])
                    .rpc();
                
                const infoAfter = await program.account.treasuryRoles.fetch(treasuryRolesPda);
                expect(infoAfter.roles.length).to.equal(countBefore);
                // console.log(`  [RemoveTreasuryRoleTests] Attempted to remove non-existent role, count unchanged (idempotent).`);
            } catch (error) {
                // Ne devrait pas arriver car l'instruction Rust est idempotente
                console.error("Error during idempotent remove test:", error);
                expect.fail('  [RemoveTreasuryRoleTests] Idempotent removal of non-existent role should not throw error.');
            }
        });
    });
} 