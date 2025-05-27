import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { expect } from 'chai';
import { Programs } from '../../../../target/types/programs';
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

export function runRemoveAdminTests() {
    describe('Instruction: remove_admin', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let initialAdmin: Keypair; // L'admin utilisé pour setup, sera souvent celui qui initie
        let adminToRemove: Keypair;
        let anotherAdmin: Keypair;
        let treasuryRolesPda: PublicKey;
        let nonAdminSigner: Keypair;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            initialAdmin = ctx.adminKeypair; // Utiliser l'admin du contexte global comme admin initial
            nonAdminSigner = Keypair.generate();
            [treasuryRolesPda] = getTreasuryRolesPda(program.programId);

            await ensureProgramConfigInitialized(ctx);
            await ensureTreasuryInitialized(ctx);
            // Pour removeAdmin, nous aurons souvent besoin d'au moins deux admins pour commencer
            // afin de pouvoir en supprimer un sans tomber à zéro.
            // ensureTreasuryRolesInitialized sera appelé dans beforeEach pour configurer l'état spécifique du test.
            console.log(`  [RemoveAdminTests] Context acquired. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)}`);
        });

        beforeEach(async () => {
            adminToRemove = Keypair.generate();
            anotherAdmin = Keypair.generate();
            // S'assurer que TreasuryRoles est initialisé avec au moins initialAdmin et adminToRemove pour la plupart des tests.
            // Certains tests peuvent avoir besoin d'un setup différent.
            await ensureTreasuryRolesInitialized(ctx, [initialAdmin.publicKey, adminToRemove.publicKey, anotherAdmin.publicKey]);
            ctx.treasuryRolesAddress = treasuryRolesPda;
            const info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            // console.log(`  [RemoveAdminTests] beforeEach: TreasuryRoles reset with admins: ${info.authorities.map(a => shortenAddress(a))}`);
        });

        it('should allow an existing admin to remove another admin', async () => {
            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.some(auth => auth.equals(adminToRemove.publicKey))).to.be.true;
            const initialAdminCount = info.authorities.length;

            await program.methods.removeAdmin(adminToRemove.publicKey)
                .accounts({ 
                    treasuryRoles: treasuryRolesPda, 
                    authority: initialAdmin.publicKey 
                })
                .signers([initialAdmin])
                .rpc();

            info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(initialAdminCount - 1);
            expect(info.authorities.some(auth => auth.equals(adminToRemove.publicKey))).to.be.false;
            expect(info.authorities.some(auth => auth.equals(initialAdmin.publicKey))).to.be.true;
            console.log(`  [RemoveAdminTests] Admin ${shortenAddress(adminToRemove.publicKey)} removed by ${shortenAddress(initialAdmin.publicKey)}. Remaining: ${info.authorities.map(a => shortenAddress(a))}`);
        });

        it('should fail if the signer is not an existing admin', async () => {
            try {
                await program.methods.removeAdmin(adminToRemove.publicKey)
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: nonAdminSigner.publicKey 
                    })
                    .signers([nonAdminSigner])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Transaction should have failed as signer is not an admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [RemoveAdminTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should fail to remove the last admin', async () => {
            // Réinitialiser avec un seul admin: initialAdmin
            await ensureTreasuryRolesInitialized(ctx, [initialAdmin.publicKey]);
            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(1, "Setup for last admin test failed");
            console.log(`  [RemoveAdminTests] Setup with single admin: ${shortenAddress(info.authorities[0])}`);

            try {
                await program.methods.removeAdmin(initialAdmin.publicKey)
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: initialAdmin.publicKey 
                    })
                    .signers([initialAdmin])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Transaction should have failed as it attempts to remove the last admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('CannotRemoveLastAdmin');
                console.log(`  [RemoveAdminTests] Correctly failed due to CannotRemoveLastAdmin.`);
            }
        });

        it('should fail to remove an admin that does not exist', async () => {
            const nonExistentAdmin = Keypair.generate().publicKey;
            try {
                await program.methods.removeAdmin(nonExistentAdmin)
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: initialAdmin.publicKey 
                    })
                    .signers([initialAdmin])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Transaction should have failed as admin to remove does not exist.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('AdminNotFound');
                console.log(`  [RemoveAdminTests] Correctly failed due to AdminNotFound.`);
            }
        });

        it('an admin should be able to remove themselves if not the last one', async () => {
            // Setup: initialAdmin, adminToRemove, anotherAdmin sont admins.
            // adminToRemove se supprime lui-même, signé par adminToRemove.
            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.some(auth => auth.equals(adminToRemove.publicKey))).to.be.true;
            const initialAdminCount = info.authorities.length;

            await program.methods.removeAdmin(adminToRemove.publicKey)
                .accounts({ 
                    treasuryRoles: treasuryRolesPda, 
                    authority: adminToRemove.publicKey // adminToRemove est l'autorité signataire
                })
                .signers([adminToRemove]) // adminToRemove signe sa propre suppression
                .rpc();

            info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(initialAdminCount - 1);
            expect(info.authorities.some(auth => auth.equals(adminToRemove.publicKey))).to.be.false;
            console.log(`  [RemoveAdminTests] Admin ${shortenAddress(adminToRemove.publicKey)} successfully removed themselves.`);
            
            // Vérifier que adminToRemove ne peut plus agir comme admin
            try {
                await program.methods.addAdmin(Keypair.generate().publicKey) // Tenter une action d'admin
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: adminToRemove.publicKey 
                    })
                    .signers([adminToRemove])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Removed admin should not be able to perform admin actions.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [RemoveAdminTests] Former admin ${shortenAddress(adminToRemove.publicKey)} correctly unauthorized.`);
            }
        });
    });
} 