import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { Keypair, PublicKey } from '@solana/web3.js';
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

// Helper function pour nettoyer les admins et ne laisser que initialAdmin
async function resetAdminsToInitial(program: Program<Programs>, treasuryRolesPda: PublicKey, initialAdminKeypair: Keypair) {
    let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    const adminsToRemove = info.authorities.filter(admin => !admin.equals(initialAdminKeypair.publicKey));
    
    for (const adminPk of adminsToRemove) {
        console.log(`  [AdminSetup] Cleaning up admin: ${shortenAddress(adminPk)}`);
        try {
            await program.methods.removeAdmin(adminPk)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: initialAdminKeypair.publicKey })
                .signers([initialAdminKeypair])
                .rpc();
        } catch (e) {
            // Si removeAdmin échoue ici, c'est un problème, mais on continue pour que le test principal puisse s'exécuter
            console.error(`  [AdminSetup] Failed to remove admin ${shortenAddress(adminPk)} during cleanup:`, e);
        }
    }
    // Vérification finale
    info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
    if (info.authorities.length !== 1 || !info.authorities[0].equals(initialAdminKeypair.publicKey)) {
        // Si même après le nettoyage, on n'a pas juste initialAdmin, c'est un problème plus profond.
        // Pourrait être dû à initialAdmin qui n'est pas admin, ou CannotRemoveLastAdmin si initialAdmin est le seul à supprimer.
        // Pour l'instant, on log et on espère que le before() du module a bien mis initialAdmin.
        console.warn(`  [AdminSetup] Warning: Admins not reset to initial correctly. Current: ${info.authorities.map(a=>shortenAddress(a))}`)
    }
}

export function runAddAdminTests() {
    describe('Instruction: add_admin', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair; // Sera initialAdmin
        let treasuryRolesPda: PublicKey;
        let newAdminCandidate1: Keypair;
        let newAdminCandidate2: Keypair;
        let anotherAdminCandidate: Keypair; // Pour le test du 4ème admin
        let nonAdminSigner: Keypair;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair; // C'est notre initialAdmin
            nonAdminSigner = Keypair.generate();
            [treasuryRolesPda] = getTreasuryRolesPda(program.programId);

            await ensureProgramConfigInitialized(ctx);
            await ensureTreasuryInitialized(ctx);
            // TreasuryRoles est initialisé avec adminKeypair comme seul admin par le before() du Module 02.
            console.log(`  [AddAdminTests] Context acquired. Initial admin: ${shortenAddress(adminKeypair.publicKey)}. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)}`);
        });

        beforeEach(async () => {
            newAdminCandidate1 = Keypair.generate();
            newAdminCandidate2 = Keypair.generate();
            anotherAdminCandidate = Keypair.generate();
            // À chaque test, s'assurer que seul adminKeypair (initialAdmin) est présent.
            // Les tests addAdmin précédents pourraient avoir laissé d'autres admins.
            console.log(`  [AddAdminTests] beforeEach: Resetting admins to initial state (${shortenAddress(adminKeypair.publicKey)} only).`);
            await resetAdminsToInitial(program, treasuryRolesPda, adminKeypair);
            const info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(1, "beforeEach failed to reset admins to initial state");
            expect(info.authorities[0].equals(adminKeypair.publicKey)).to.be.true;
        });

        it('should allow an existing admin to add a new admin (up to 3 total)', async () => {
            // Test 1: Ajout du 2ème admin
            console.log(`  [AddAdminTests] Adding 2nd admin: ${shortenAddress(newAdminCandidate1.publicKey)}`);
            await program.methods.addAdmin(newAdminCandidate1.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair])
                .rpc();
            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(2);
            expect(info.authorities.some(auth => auth.equals(newAdminCandidate1.publicKey))).to.be.true;
            console.log(`  [AddAdminTests] Successfully added ${shortenAddress(newAdminCandidate1.publicKey)}. Admins: ${info.authorities.map(a => shortenAddress(a))}`);

            // Test 2: Ajout du 3ème admin
            console.log(`  [AddAdminTests] Adding 3rd admin: ${shortenAddress(newAdminCandidate2.publicKey)}`);
            await program.methods.addAdmin(newAdminCandidate2.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair])
                .rpc();
            info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(3);
            expect(info.authorities.some(auth => auth.equals(newAdminCandidate2.publicKey))).to.be.true;
            console.log(`  [AddAdminTests] Successfully added ${shortenAddress(newAdminCandidate2.publicKey)}. Admins: ${info.authorities.map(a => shortenAddress(a))}`);
        });

        it('should fail if the signer is not an existing admin', async () => {
            // Le beforeEach a déjà réinitialisé à 1 admin (adminKeypair)
            try {
                await program.methods.addAdmin(newAdminCandidate1.publicKey)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: nonAdminSigner.publicKey })
                    .signers([nonAdminSigner])
                    .rpc();
                expect.fail('  [AddAdminTests] Transaction should have failed as signer is not admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [AddAdminTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should fail to add an admin that already exists', async () => {
            // Le beforeEach a réinitialisé à 1 admin (adminKeypair)
            // Ajoutons newAdminCandidate1 une première fois
            await program.methods.addAdmin(newAdminCandidate1.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            console.log(`  [AddAdminTests] ${shortenAddress(newAdminCandidate1.publicKey)} added once for duplicate test.`);

            try {
                await program.methods.addAdmin(newAdminCandidate1.publicKey) // Tenter de l'ajouter à nouveau
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [AddAdminTests] Transaction should have failed as admin already exists.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('RoleAlreadyExists');
                console.log(`  [AddAdminTests] Correctly failed due to RoleAlreadyExists.`);
            }
        });
        
        it('should fail to add a 4th admin when limit is 3', async () => {
            // Le beforeEach a réinitialisé à 1 admin (adminKeypair)
            // Ajoutons newAdminCandidate1 (2ème) et newAdminCandidate2 (3ème)
            await program.methods.addAdmin(newAdminCandidate1.publicKey).accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey }).signers([adminKeypair]).rpc();
            await program.methods.addAdmin(newAdminCandidate2.publicKey).accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey }).signers([adminKeypair]).rpc();
            
            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(3, "Setup for 4th admin test failed, did not reach 3 admins.");
            console.log(`  [AddAdminTests] Reached 3 admins: ${info.authorities.map(a => shortenAddress(a))}. Attempting to add 4th: ${shortenAddress(anotherAdminCandidate.publicKey)}`);

            try {
                await program.methods.addAdmin(anotherAdminCandidate.publicKey)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [AddAdminTests] Should have failed to add 4th admin.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('MaxAdminsReached'); // MODIFIÉ ICI
                console.log(`  [AddAdminTests] Correctly failed due to MaxAdminsReached.`);
            }
        });
    });
} 