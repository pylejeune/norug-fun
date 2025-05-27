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

export function runAddAdminTests() {
    describe('Instruction: add_admin', () => {
        let ctx: TestContext;
        let program: Program<Programs>;
        let adminKeypair: Keypair; // L'admin initial du TreasuryRoles
        let treasuryRolesPda: PublicKey;
        let newAdminCandidate1: Keypair;
        let newAdminCandidate2: Keypair;
        let newAdminCandidate3: Keypair;
        let nonAdminSigner: Keypair;

        before(async () => {
            ctx = getInitializedContext();
            program = ctx.program;
            adminKeypair = ctx.adminKeypair;
            nonAdminSigner = Keypair.generate(); // Un keypair qui n'est pas admin

            // S'assurer que tout est en place
            await ensureProgramConfigInitialized(ctx);
            await ensureTreasuryInitialized(ctx); // Requis si des instructions interagissent avec Treasury
            
            // Initialiser TreasuryRoles avec l'adminKeypair comme seul admin initial
            // Cette fonction est idempotente.
            [treasuryRolesPda] = getTreasuryRolesPda(program.programId);
            await ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey]);
            ctx.treasuryRolesAddress = treasuryRolesPda; // S'assurer qu'il est dans le ctx

            console.log(`  [AddAdminTests] Context acquired. treasuryRolesPda: ${shortenAddress(treasuryRolesPda)} initialized with admin ${shortenAddress(adminKeypair.publicKey)}`);
        });

        beforeEach(() => {
            // Générer de nouveaux candidats administrateurs pour chaque test pour éviter les états persistants
            newAdminCandidate1 = Keypair.generate();
            newAdminCandidate2 = Keypair.generate();
            newAdminCandidate3 = Keypair.generate();
            // console.log(`  [AddAdminTests] beforeEach: New admin candidates generated.`);
        });

        it('should allow an existing admin to add a new admin', async () => {
            await program.methods.addAdmin(newAdminCandidate1.publicKey)
                .accounts({
                    treasuryRoles: treasuryRolesPda,
                    authority: adminKeypair.publicKey, // adminKeypair est l'admin initial
                })
                .signers([adminKeypair])
                .rpc();

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(accountInfo.authorities.length).to.equal(2);
            expect(accountInfo.authorities.some(auth => auth.equals(newAdminCandidate1.publicKey))).to.be.true;
            expect(accountInfo.authorities.some(auth => auth.equals(adminKeypair.publicKey))).to.be.true;
            console.log(`  [AddAdminTests] Successfully added ${shortenAddress(newAdminCandidate1.publicKey)}. Admins: ${accountInfo.authorities.map(a => shortenAddress(a))}`);
        });

        it('should fail if the signer is not an existing admin', async () => {
            try {
                await program.methods.addAdmin(newAdminCandidate1.publicKey)
                    .accounts({
                        treasuryRoles: treasuryRolesPda,
                        authority: nonAdminSigner.publicKey, // nonAdminSigner n'est pas admin
                    })
                    .signers([nonAdminSigner]) // Signé par le non-admin
                    .rpc();
                expect.fail('  [AddAdminTests] Transaction should have failed as signer is not an admin.');
            } catch (error) {
                // console.log("Error in non-admin test:", JSON.stringify(error, null, 2));
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('Unauthorized');
                console.log(`  [AddAdminTests] Correctly failed due to Unauthorized signer.`);
            }
        });

        it('should fail to add an admin that already exists', async () => {
            // Ajouter newAdminCandidate1 une première fois
            await program.methods.addAdmin(newAdminCandidate1.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            console.log(`  [AddAdminTests] ${shortenAddress(newAdminCandidate1.publicKey)} added for duplicate test.`);

            try {
                // Tenter de l'ajouter à nouveau
                await program.methods.addAdmin(newAdminCandidate1.publicKey)
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [AddAdminTests] Transaction should have failed as admin already exists.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('AdminAlreadyExists');
                console.log(`  [AddAdminTests] Correctly failed due to AdminAlreadyExists.`);
            }
        });

        it('should allow adding admins up to the limit of 3', async () => {
            // adminKeypair est le 1er
            // Ajout du 2ème admin
            await program.methods.addAdmin(newAdminCandidate1.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                .signers([adminKeypair]).rpc();
            console.log(`  [AddAdminTests] 2nd admin ${shortenAddress(newAdminCandidate1.publicKey)} added.`);

            // Ajout du 3ème admin (par le 2ème admin, pour varier)
            await program.methods.addAdmin(newAdminCandidate2.publicKey)
                .accounts({ treasuryRoles: treasuryRolesPda, authority: newAdminCandidate1.publicKey })
                .signers([newAdminCandidate1]).rpc(); // newAdminCandidate1 est maintenant admin
            console.log(`  [AddAdminTests] 3rd admin ${shortenAddress(newAdminCandidate2.publicKey)} added by ${shortenAddress(newAdminCandidate1.publicKey)}.`);

            const accountInfo = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(accountInfo.authorities.length).to.equal(3);
            expect(accountInfo.authorities.some(auth => auth.equals(adminKeypair.publicKey))).to.be.true;
            expect(accountInfo.authorities.some(auth => auth.equals(newAdminCandidate1.publicKey))).to.be.true;
            expect(accountInfo.authorities.some(auth => auth.equals(newAdminCandidate2.publicKey))).to.be.true;
            console.log(`  [AddAdminTests] Admins at limit (3): ${accountInfo.authorities.map(a => shortenAddress(a))}`);
        });

        it('should fail to add a 4th admin when limit is 3', async () => {
            // S'assurer qu'on est à 3 admins (adminKeypair + newAdminCandidate1 + newAdminCandidate2)
            // On ne peut pas se fier à l'état du test précédent, donc on les ajoute ici si nécessaire
            // D'abord, s'assurer que TreasuryRoles est propre avec seulement adminKeypair
            await ensureTreasuryRolesInitialized(ctx, [adminKeypair.publicKey]); 
            let info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            console.log(`  [AddAdminTests] Reset to 1 admin: ${shortenAddress(info.authorities[0])}`);

            await program.methods.addAdmin(newAdminCandidate1.publicKey).accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey }).signers([adminKeypair]).rpc();
            await program.methods.addAdmin(newAdminCandidate2.publicKey).accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey }).signers([adminKeypair]).rpc();
            info = await program.account.treasuryRoles.fetch(treasuryRolesPda);
            expect(info.authorities.length).to.equal(3, "Setup for 4th admin test failed: not 3 admins");
            console.log(`  [AddAdminTests] Now at 3 admins for 4th admin test: ${info.authorities.map(a => shortenAddress(a))}`);

            try {
                await program.methods.addAdmin(newAdminCandidate3.publicKey) // Tentative d'ajout du 4ème
                    .accounts({ treasuryRoles: treasuryRolesPda, authority: adminKeypair.publicKey })
                    .signers([adminKeypair]).rpc();
                expect.fail('  [AddAdminTests] Transaction should have failed as it exceeds admin limit.');
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal('MaxAdminsReached');
                console.log(`  [AddAdminTests] Correctly failed due to MaxAdminsReached.`);
            }
        });

        // Test pour le payeur si différent de l'autorité (non applicable ici car l'autorité signe et paie implicitement via Anchor)
    });
} 