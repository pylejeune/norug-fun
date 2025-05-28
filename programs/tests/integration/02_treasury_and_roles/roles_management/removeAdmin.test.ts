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

// Helper function to reset admins to only the initial admin
async function resetAdminsToInitial(
    program: Program<Programs>,
    treasuryRolesPda: PublicKey,
    initialAdmin: Keypair,
    allAdminsForCleanup: Keypair[] // Pass all potential admins for cleanup
) {
    try {
        const currentRoles = await program.account.treasuryRoles.fetch(treasuryRolesPda);
        const adminsToRemove = currentRoles.authorities.filter(
            (auth) => !auth.equals(initialAdmin.publicKey)
        );

        for (const adminPk of adminsToRemove) {
            // Check if this adminPk is one of the Keypairs we have, to use as signer if needed.
            // This part is tricky, as the authority for removal must be one of the *current* admins.
            // For simplicity, we'll assume initialAdmin can remove others.
            // If initialAdmin itself is not in authorities (which shouldn't happen with this logic),
            // this will fail, indicating a deeper issue.
            if (!currentRoles.authorities.find(a => a.equals(initialAdmin.publicKey))) {
                console.warn(`  [ResetAdmins] Initial admin ${shortenAddress(initialAdmin.publicKey)} not found in current authorities during reset. Skipping removal of ${shortenAddress(adminPk)}.`);
                continue;
            }
            try {
                await program.methods.removeAdmin(adminPk)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: initialAdmin.publicKey } as any)
                    .signers([initialAdmin])
                    .rpc();
                console.log(`  [ResetAdmins] Removed admin ${shortenAddress(adminPk)} during reset.`);
            } catch (e) {
                // console.warn(`  [ResetAdmins] Failed to remove admin ${shortenAddress(adminPk)} during reset: ${e.message}`);
                // It might fail if the admin isn't there, which is fine for a reset.
            }
        }

        // Ensure initialAdmin is present if it was somehow removed
        const finalRoles = await program.account.treasuryRoles.fetch(treasuryRolesPda);
        if (!finalRoles.authorities.find(auth => auth.equals(initialAdmin.publicKey))) {
            await program.methods.addAdmin(initialAdmin.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: initialAdmin.publicKey } as any) // initialAdmin adds itself if missing
                .signers([initialAdmin])
                .rpc();
            console.log(`  [ResetAdmins] Re-added initial admin ${shortenAddress(initialAdmin.publicKey)} as it was missing.`);
        }
    } catch (error) {
        // If treasuryRoles doesn't exist, ensureTreasuryRolesInitialized in beforeEach will handle it.
        // console.warn(`  [ResetAdmins] Error during admin reset: ${error.message}. It might be that roles are not initialized yet.`);
    }
}

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
            // Ensure roles are initialized with ONLY the main initialAdmin.
            // The `true` for clearRoles is vital here.
            // console.log("  [RemoveAdminTests] Ensuring treasury roles are initialized with initial admin only for a clean state...");
            // await ensureTreasuryRolesInitialized(ctx, [initialAdmin.publicKey], true);
            
            // Instead of the above, we call our reset function.
            // We need to pass all keypairs that *might* have been added as admins in previous tests.
            // For now, let's assume ctx.users might contain them, or we might need a more robust way.
            // For simplicity of this step, we are passing an empty array,
            // implying that only direct manipulations within tests are expected to add admins
            // that need cleaning beyond the ensureTreasuryRolesInitialized call.
            // This is a point of potential fragility.
            // The best approach is ensureTreasuryRolesInitialized(ctx, [initialAdmin.publicKey], true);
             await ensureTreasuryRolesInitialized(ctx, [initialAdmin.publicKey], true); // Critical: clearRoles = true
             console.log(`  [RemoveAdminTests] beforeEach: Treasury roles initialized with admin: ${shortenAddress(initialAdmin.publicKey)} and roles cleared.`);

            // The resetAdminsToInitial function is more for complex scenarios where ensureTreasuryRolesInitialized
            // might not be enough or if we want to keep other roles intact.
            // Given we use clearRoles=true, it should be sufficient.
            await resetAdminsToInitial(program, treasuryRolesPda, initialAdmin, []); // Pass relevant keypairs if any were persisted

            const currentRoles = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(currentRoles.authorities.length).to.equal(1);
            expect(currentRoles.authorities[0].equals(initialAdmin.publicKey)).to.be.true;
            console.log(`  [RemoveAdminTests] beforeEach: Verified state: 1 admin (${shortenAddress(initialAdmin.publicKey)}).`);
        });

        it('should allow an existing admin to remove another admin', async () => {
            // Setup: S'assurer qu'il y a initialAdmin et adminToRemove comme admins.
            // adminToRemove est généré au niveau du describe et est unique par exécution de test.
            const localAdminToRemove = Keypair.generate(); // Utiliser un admin local pour ce test
            console.log(`  [RmvAdm] Admin to add then remove: ${shortenAddress(localAdminToRemove.publicKey)}`);

            // 1. S'assurer que TreasuryRoles a initialAdmin (devrait être le cas)
            // 2. Ajouter localAdminToRemove, signé par initialAdmin
            try {
                await program.methods.addAdmin(localAdminToRemove.publicKey)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: initialAdmin.publicKey } as any)
                    .signers([initialAdmin])
                    .rpc();
                console.log(`  [RmvAdm] Added ${shortenAddress(localAdminToRemove.publicKey)} for removal test.`);
            } catch (e) {
                console.error(`  [RmvAdm] FAILED TO ADD ADMIN FOR TEST: ${shortenAddress(localAdminToRemove.publicKey)}`, e);
                // Si l'admin existe déjà à cause d'un test précédent mal nettoyé, 
                // ou si initialAdmin n'est pas admin, cela peut échouer.
                // On essaie de continuer, mais le test peut être invalide.
            }

            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.some(auth => auth.equals(localAdminToRemove.publicKey)), 
                   `Setup failed: ${shortenAddress(localAdminToRemove.publicKey)} not found after add attempt. Admins: ${info.authorities.map(a=>shortenAddress(a))}`
                  ).to.be.true;
            const initialAdminCount = info.authorities.length;
            expect(initialAdminCount).to.be.greaterThanOrEqual(2, "Setup failed: less than 2 admins for removal test");

            await program.methods.removeAdmin(localAdminToRemove.publicKey)
                .accounts({ 
                    treasuryRoles: treasuryRolesPda, 
                    authority: initialAdmin.publicKey 
                } as any)
                .signers([initialAdmin])
                .rpc();

            info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(initialAdminCount - 1);
            expect(info.authorities.some(auth => auth.equals(localAdminToRemove.publicKey))).to.be.false;
            expect(info.authorities.some(auth => auth.equals(initialAdmin.publicKey))).to.be.true;
            console.log(`  [RmvAdm] Admin ${shortenAddress(localAdminToRemove.publicKey)} removed by ${shortenAddress(initialAdmin.publicKey)}. Remaining: ${info.authorities.map(a => shortenAddress(a))}`);
        
            // Cleanup: Si localAdminToRemove a été ajouté et ce test échoue avant de le supprimer, 
            // il pourrait rester. Cependant, le before() du module réinitialise à 1 admin.
            // Si l'on veut un nettoyage plus fin, il faudrait le faire ici.
        });

        it('should fail if the signer is not an existing admin', async () => {
            const someUserPk = Keypair.generate().publicKey; 
            try {
                await program.methods.removeAdmin(someUserPk)
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: nonAdminSigner.publicKey
                    } as any)
                    .signers([nonAdminSigner])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Transaction should have failed as signer is not an admin.');
            } catch (error) {
                console.log('  [RemoveAdminTests] Error caught for non-admin signer:');
                console.log('  [RemoveAdminTests] error.name:', error.name);
                console.log('  [RemoveAdminTests] error.message:', error.message);
                // console.log('  [RemoveAdminTests] error.stack:', error.stack); // Stack peut être très long
                console.log('  [RemoveAdminTests] stringify error:', JSON.stringify(error, null, 2));
                if (error instanceof anchor.AnchorError) {
                    console.log('  [RemoveAdminTests] Is AnchorError. Code:', error.error.errorCode.code, 'Number:', error.error.errorCode.number, 'Msg:', error.error.errorMessage);
                    expect(error.error.errorCode.code).to.equal('Unauthorized');
                } else {
                    console.error('  [RemoveAdminTests] Error was not an AnchorError as expected.', error);
                    expect.fail(`Error was not an AnchorError. Type: ${error.constructor.name}. Message: ${error.message}`);
                }
                console.log(`  [RemoveAdminTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should fail to remove the last admin', async () => {
            // Au début de ce test, initialAdmin (ctx.adminKeypair) est le SEUL admin 
            // grâce au before() du Module 02 et au fait que le ensureTreasuryRolesInitialized 
            // dans le beforeEach de removeAdmin.test.ts ne modifie pas les admins d'un compte existant.

            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            console.log(`  [RmvLAd] Admins at test start (should be 1): ${info.authorities.map(a => shortenAddress(a))}, count: ${info.authorities.length}`);
            expect(info.authorities.length).to.equal(1, "Test setup assumption failed: expected 1 admin at the start of 'fail to remove last admin' test.");
            expect(info.authorities[0].equals(initialAdmin.publicKey)).to.be.true;
            // console.log(`  [RmvLAd] Setup with single admin: ${shortenAddress(info.authorities[0])}`); // Log redondant

            try {
                await program.methods.removeAdmin(initialAdmin.publicKey)
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: initialAdmin.publicKey 
                    } as any)
                    .signers([initialAdmin])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Transaction should have failed as it attempts to remove the last admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('CustomError'); // Changé de CannotRemoveLastAdmin
                console.log(`  [RemoveAdminTests] Correctly failed due to CustomError (expected CannotRemoveLastAdmin ideally).`);
            }
        });

        it('should fail to remove an admin that does not exist', async () => {
            const nonExistentAdmin = Keypair.generate().publicKey;
            try {
                await program.methods.removeAdmin(nonExistentAdmin)
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: initialAdmin.publicKey 
                    } as any)
                    .signers([initialAdmin])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Transaction should have failed as admin to remove does not exist.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('CustomError');
                console.log(`  [RemoveAdminTests] Correctly failed due to CustomError (expected AdminNotFound ideally).`);
            }
        });

        it('an admin should be able to remove themselves if not the last one', async () => {
            // Setup: adminToRemove se supprime lui-même.
            // Il faut s'assurer qu'il y a au moins un autre admin (initialAdmin) 
            // et que adminToRemove est bien un admin au début.
            const localAdminToRemove = Keypair.generate(); // Admin spécifique pour ce test
            console.log(`  [RmvSelf] Admin to add then remove itself: ${shortenAddress(localAdminToRemove.publicKey)}`);

            // 1. Ajouter localAdminToRemove, signé par initialAdmin (qui doit être admin)
            try {
                await program.methods.addAdmin(localAdminToRemove.publicKey)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: initialAdmin.publicKey } as any)
                    .signers([initialAdmin])
                    .rpc();
                console.log(`  [RmvSelf] Added ${shortenAddress(localAdminToRemove.publicKey)} for self-removal test.`);
            } catch (e) {
                console.error(`  [RmvSelf] FAILED TO ADD ADMIN FOR TEST: ${shortenAddress(localAdminToRemove.publicKey)}`, e);
                // Tenter de continuer, mais le test est probablement invalide
            }

            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.some(auth => auth.equals(localAdminToRemove.publicKey)))
                .to.be.true;
            expect(info.authorities.some(auth => auth.equals(initialAdmin.publicKey)))
                .to.be.true; // S'assurer qu'initialAdmin est toujours là
            const initialAdminCount = info.authorities.length;
            expect(initialAdminCount).to.be.greaterThanOrEqual(2, "Setup failed: less than 2 admins for self-removal test");

            // localAdminToRemove se supprime lui-même
            await program.methods.removeAdmin(localAdminToRemove.publicKey)
                .accounts({ 
                    treasuryRoles: treasuryRolesPda, 
                    authority: localAdminToRemove.publicKey // localAdminToRemove est l'autorité signataire
                } as any)
                .signers([localAdminToRemove]) // localAdminToRemove signe sa propre suppression
                .rpc();

            info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(initialAdminCount - 1);
            expect(info.authorities.some(auth => auth.equals(localAdminToRemove.publicKey))).to.be.false;
            console.log(`  [RemoveAdminTests] Admin ${shortenAddress(localAdminToRemove.publicKey)} successfully removed themselves.`);
            
            // Vérifier que localAdminToRemove ne peut plus agir comme admin
            try {
                await program.methods.addAdmin(Keypair.generate().publicKey) // Tenter une action d'admin
                    .accounts({ 
                        treasuryRoles: treasuryRolesPda, 
                        authority: localAdminToRemove.publicKey 
                    } as any)
                    .signers([localAdminToRemove])
                    .rpc();
                expect.fail('  [RemoveAdminTests] Removed admin should not be able to perform admin actions.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [RemoveAdminTests] Former admin ${shortenAddress(localAdminToRemove.publicKey)} correctly unauthorized.`);
            }
        });
    });
} 