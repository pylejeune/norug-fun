import * as anchor from "@coral-xyz/anchor";
import { Program, web3 } from "@coral-xyz/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
// epochStatus n'est pas exporté directement, nous accédons aux statuts via les clés de l'objet.
import { Programs } from "../target/types/programs"; 

// TODO: Importer ou définir les fonctions de setup nécessaires :
// import {
//   initializeTestContext,
//   ensureProgramConfigInitialized,
//   // ... autres fonctions de setup (epoch, proposal)
// } from "./setup"; // Adaptez le chemin vers vos utilitaires de setup

// TODO: Définir un type pour le contexte de test si vous en utilisez un unifié
// interface TestContext { 
//   provider: anchor.AnchorProvider;
//   program: Program<Programs>;
//   adminKeypair: Keypair;
//   programConfigAddress: PublicKey;
//   // ... autres éléments utiles
// }

// Seed fixe pour l'autorité admin des tests (COHÉRENT AVEC LES AUTRES FICHIERS)
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

const getProgramConfigPda = (programId: PublicKey): [PublicKey, number] => {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId
    );
};


describe("ProgramConfig - Admin Only Instructions Authorization", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    // Tentative sans cast explicite pour voir si cela aide le linter
    const program = anchor.workspace.Programs;
    let adminKeypair: Keypair;
    let nonAdminKeypair: Keypair;
    let programConfigAddress: PublicKey;

    before(async () => {
        // Créer et financer adminKeypair explicitement
        adminKeypair = Keypair.fromSeed(ADMIN_SEED); // UTILISER LE SEED
        nonAdminKeypair = Keypair.generate();
        const connection = provider.connection;

        // Airdrop pour adminKeypair (s'assurer qu'il est financé)
        const adminInfo = await connection.getAccountInfo(adminKeypair.publicKey);
        if (!adminInfo || adminInfo.lamports < 2 * anchor.web3.LAMPORTS_PER_SOL) {
            const adminAirdropSignature = await connection.requestAirdrop(
                adminKeypair.publicKey,
                2 * anchor.web3.LAMPORTS_PER_SOL 
            );
            await connection.confirmTransaction(adminAirdropSignature, "confirmed");
            console.log(`Admin keypair ${adminKeypair.publicKey.toBase58()} funded in programconfig.test.ts.`);
        } else {
            console.log(`Admin keypair ${adminKeypair.publicKey.toBase58()} already funded in programconfig.test.ts.`);
        }

        // Airdrop pour nonAdminKeypair
        const nonAdminAirdropSignature = await connection.requestAirdrop(
            nonAdminKeypair.publicKey,
            1 * anchor.web3.LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(nonAdminAirdropSignature, "confirmed");
        
        [programConfigAddress] = getProgramConfigPda(program.programId);

        try {
            await program.methods
                .initializeProgramConfig(adminKeypair.publicKey) 
                .accounts({
                    programConfig: programConfigAddress,
                    authority: adminKeypair.publicKey,
                    systemProgram: SystemProgram.programId,
                })
                .signers([adminKeypair]) // adminKeypair signe l'initialisation
                .rpc();
            console.log("ProgramConfig initialized by admin.");
        } catch (error) {
            const errorString = (error as Error).toString();
            if (errorString.includes("already in use") || 
                errorString.includes("custom program error: 0x0") || 
                errorString.includes("Program account already initialized")) {
                 console.log("ProgramConfig already initialized or similar error.");
            } else {
                console.error("Error during ProgramConfig initialization:", error);
                throw error;
            }
        }
        // Vérification explicite après initialisation ou tentative
        const configAccount = await program.account.programConfig.fetch(programConfigAddress);
        if (!configAccount.adminAuthority.equals(adminKeypair.publicKey)) {
            console.error(`ProgramConfig admin authority mismatch in programconfig.test.ts: Expected ${adminKeypair.publicKey.toBase58()}, Found ${configAccount.adminAuthority.toBase58()}`);
            throw new Error("ProgramConfig admin authority mismatch after setup in programconfig.test.ts");
        }
         console.log(`Confirmed admin authority in ProgramConfig for programconfig.test.ts: ${configAccount.adminAuthority.toBase58()}`);
    });

    describe("start_epoch", () => {
        const now = Date.now();
        const epochId = new anchor.BN(now); 
        const startTime = new anchor.BN(Math.floor(now / 1000));
        const endTime = new anchor.BN(Math.floor(now / 1000) + 3600);

        const getEpochManagementPda = (currentEpochId: anchor.BN): [PublicKey, number] => {
            return PublicKey.findProgramAddressSync(
                [Buffer.from("epoch"), currentEpochId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );
        };

        it("should allow admin_authority to call start_epoch", async () => {
            const [epochManagementAddress] = getEpochManagementPda(epochId);
            await program.methods
                .startEpoch(epochId, startTime, endTime) 
                .accounts({
                    authority: adminKeypair.publicKey,
                    programConfig: programConfigAddress,
                    epochManagement: epochManagementAddress,
                    systemProgram: SystemProgram.programId,
                })
                .signers([adminKeypair])
                .rpc();
            
            const epochAccount = await program.account.epochManagement.fetch(epochManagementAddress);
            expect(epochAccount.epochId.eq(epochId)).to.be.true;
            expect(epochAccount.status.active).to.exist; 
        });

        it("should prevent non_admin_authority from calling start_epoch and return Unauthorized error", async () => {
            const currentEpochId = new anchor.BN(epochId.toNumber() + 1);
            const [epochManagementAddress] = getEpochManagementPda(currentEpochId);
            try {
                await program.methods
                    .startEpoch(currentEpochId, startTime, endTime) 
                    .accounts({
                        authority: nonAdminKeypair.publicKey,
                        programConfig: programConfigAddress,
                        epochManagement: epochManagementAddress,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([nonAdminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed with Unauthorized error");
            } catch (error) {
                expect((error as AnchorError).error.errorCode.code).to.equal("Unauthorized");
                expect((error as AnchorError).error.errorCode.number).to.equal(6023);
            }
        });

   
    });

    describe("end_epoch", () => {
        // Pré-requis: un epoch doit être démarré
        // TODO: Ajouter un before() ou un setup pour démarrer un epoch spécifique pour ces tests
        it("should allow admin_authority to call end_epoch", async () => {
            // TODO: Implémentation
        });

        it("should prevent non_admin_authority from calling end_epoch and return Unauthorized error", async () => {
            // TODO: Implémentation
        });

    });

    describe("update_proposal_status", () => {
        // Pré-requis: un epoch doit être fermé, une proposition doit exister dans cet epoch
        // TODO: Ajouter setup
        it("should allow admin_authority to call update_proposal_status", async () => {
            // TODO: Implémentation
        });

        it("should prevent non_admin_authority from calling update_proposal_status and return Unauthorized error", async () => {
            // TODO: Implémentation
        });

    });
    
    describe("mark_epoch_processed", () => {
        // Pré-requis: un epoch doit être fermé (ou dans un état approprié pour être marqué comme traité)
        // TODO: Ajouter setup
        it("should allow admin_authority to call mark_epoch_processed", async () => {
            // TODO: Implémentation
        });

        it("should prevent non_admin_authority from calling mark_epoch_processed and return Unauthorized error", async () => {
            // TODO: Implémentation
        });
    
    });
});

// Définition du type AnchorError pour un meilleur typage des erreurs
interface AnchorError extends Error {
    error: {
        errorCode: {
            code: string; // ex: "Unauthorized"
            number: number; // ex: 6023
        };
        errorMessage: string;
        // ... autres propriétés possibles
    };
    // ... autres propriétés possibles
} 