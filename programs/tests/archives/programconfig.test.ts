import * as anchor from "@coral-xyz/anchor";
// import { Program, web3 } from "@coral-xyz/anchor"; // Supprimer cette ligne
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
// epochStatus n'est pas exporté directement, nous accédons aux statuts via les clés de l'objet.
import { Programs } from "../target/types/programs"; 

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

    describe("Instruction start_epoch : ProgramConfig authorization", () => {
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
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("Unauthorized");
                expect((error as anchor.AnchorError).error.errorCode.number).to.equal(6023);
            }
        });

   
    });

    describe("Instruction end_epoch : ProgramConfig authorization", () => {
        let testEpochId: anchor.BN;
        let epochManagementAddress: PublicKey;

        beforeEach(async () => {
            // Créer un epoch actif que l'admin pourra ensuite fermer
            testEpochId = new anchor.BN(Date.now()); // ID unique pour chaque test de ce describe
            const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 60); // Déjà commencé
            const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 3600); // Se termine dans 1h
            [epochManagementAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("epoch"), testEpochId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            await program.methods
                .startEpoch(testEpochId, startTime, endTime)
                .accounts({
                    authority: adminKeypair.publicKey,
                    programConfig: programConfigAddress,
                    epochManagement: epochManagementAddress,
                    systemProgram: SystemProgram.programId,
                })
                .signers([adminKeypair])
                .rpc();
            
            const epochAccount = await program.account.epochManagement.fetch(epochManagementAddress);
            expect(epochAccount.status.active).to.exist; 
        });

        it("should allow admin_authority to call end_epoch and successfully end an epoch", async () => {
            await program.methods
                .endEpoch(testEpochId)
                .accounts({
                    authority: adminKeypair.publicKey,
                    programConfig: programConfigAddress,
                    epochManagement: epochManagementAddress,
                    systemProgram: SystemProgram.programId,
                })
                .signers([adminKeypair])
                .rpc();
            
            const epochAccount = await program.account.epochManagement.fetch(epochManagementAddress);
            expect(epochAccount.status.closed).to.exist;
        });

        it("should prevent non_admin_authority from calling end_epoch and return Unauthorized error", async () => {
            try {
                await program.methods
                    .endEpoch(testEpochId)
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
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("Unauthorized");
                expect((error as anchor.AnchorError).error.errorCode.number).to.equal(6023);
            }
        });
    });

    describe("Instruction update_proposal_status : ProgramConfig authorization", () => {
        let testEpochId: anchor.BN;
        let epochManagementAddress: PublicKey;
        let proposalCreator: Keypair; // Peut être adminKeypair ou un autre
        let proposalAddress: PublicKey;
        const tokenName = "testProposalForUpdate";
        const tokenSymbol = "TPU";

        beforeEach(async () => {
            testEpochId = new anchor.BN(Date.now());
            proposalCreator = adminKeypair; // Utiliser adminKeypair comme créateur pour simplifier
            const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 120); // Commence il y a 2 mins
            const endTime = new anchor.BN(Math.floor(Date.now() / 1000) - 60);   // Fini il y a 1 min

            [epochManagementAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("epoch"), testEpochId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );
            [proposalAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("proposal"), proposalCreator.publicKey.toBuffer(), testEpochId.toArrayLike(Buffer, "le", 8), Buffer.from(tokenName)],
                program.programId
            );

            // 1. Start Epoch
            await program.methods
                .startEpoch(testEpochId, startTime, endTime)
                .accounts({ 
                    authority: adminKeypair.publicKey, 
                    programConfig: programConfigAddress, 
                    epochManagement: epochManagementAddress, 
                    systemProgram: SystemProgram.programId 
                })
                .signers([adminKeypair])
                .rpc();

            // 2. Create Proposal
            // S'assurer que proposalCreator est financé s'il est différent de adminKeypair
            // (ici, ils sont identiques, donc adminKeypair est déjà financé)
            await program.methods
                .createProposal(tokenName, tokenSymbol, "Test desc", null, new anchor.BN(1000), 10, new anchor.BN(0))
                .accounts({
                    creator: proposalCreator.publicKey,
                    tokenProposal: proposalAddress,
                    epoch: epochManagementAddress,
                    programConfig: programConfigAddress, // Ajouté pour la nouvelle logique de create_proposal
                    systemProgram: SystemProgram.programId,
                    // treasury: treasuryPda, // Si create_proposal interagit avec treasury, il faudrait le setup
                })
                .signers([proposalCreator])
                .rpc();
            
            // 3. End Epoch
            await program.methods
                .endEpoch(testEpochId)
                .accounts({ 
                    authority: adminKeypair.publicKey, 
                    programConfig: programConfigAddress, 
                    epochManagement: epochManagementAddress, 
                    systemProgram: SystemProgram.programId 
                })
                .signers([adminKeypair])
                .rpc();
            
            const epochAccount = await program.account.epochManagement.fetch(epochManagementAddress);
            expect(epochAccount.status.closed).to.exist;
            const proposalAccount = await program.account.tokenProposal.fetch(proposalAddress);
            expect(proposalAccount.status.active).to.exist;
        });

        it("should allow admin_authority to call update_proposal_status and successfully update status", async () => {
            await program.methods
                .updateProposalStatus({ validated: {} }) // Passer à Validated
                .accounts({
                    authority: adminKeypair.publicKey,
                    programConfig: programConfigAddress,
                    epochManagement: epochManagementAddress,
                    proposal: proposalAddress,
                })
                .signers([adminKeypair])
                .rpc();

            const proposalAccount = await program.account.tokenProposal.fetch(proposalAddress);
            expect(proposalAccount.status.validated).to.exist;
        });

        it("should prevent non_admin_authority from calling update_proposal_status and return Unauthorized error", async () => {
            try {
                await program.methods
                    .updateProposalStatus({ rejected: {} }) // Tenter de passer à Rejected
                    .accounts({
                        authority: nonAdminKeypair.publicKey,
                        programConfig: programConfigAddress,
                        epochManagement: epochManagementAddress,
                        proposal: proposalAddress,
                    })
                    .signers([nonAdminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed with Unauthorized error");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("Unauthorized");
                expect((error as anchor.AnchorError).error.errorCode.number).to.equal(6023);
            }
        });
    });
    
    describe("Instruction mark_epoch_processed : ProgramConfig authorization", () => {
        let testEpochId: anchor.BN;
        let epochManagementAddress: PublicKey;

        beforeEach(async () => {
            // Créer un epoch actif puis le fermer
            testEpochId = new anchor.BN(Date.now()); 
            const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 120); 
            const endTime = new anchor.BN(Math.floor(Date.now() / 1000) - 60);   
            [epochManagementAddress] = PublicKey.findProgramAddressSync(
                [Buffer.from("epoch"), testEpochId.toArrayLike(Buffer, "le", 8)],
                program.programId
            );

            // 1. Start Epoch
            await program.methods
                .startEpoch(testEpochId, startTime, endTime)
                .accounts({ 
                    authority: adminKeypair.publicKey, 
                    programConfig: programConfigAddress, 
                    epochManagement: epochManagementAddress, 
                    systemProgram: SystemProgram.programId 
                })
                .signers([adminKeypair])
                .rpc();
            
            // 2. End Epoch
            await program.methods
                .endEpoch(testEpochId)
                .accounts({ 
                    authority: adminKeypair.publicKey, 
                    programConfig: programConfigAddress, 
                    epochManagement: epochManagementAddress, 
                    systemProgram: SystemProgram.programId 
                })
                .signers([adminKeypair])
                .rpc();
            
            const epochAccount = await program.account.epochManagement.fetch(epochManagementAddress);
            expect(epochAccount.status.closed).to.exist;
            expect(epochAccount.processed).to.be.false;
        });

        it("should allow admin_authority to call mark_epoch_processed and successfully mark epoch as processed", async () => {
            await program.methods
                .markEpochProcessed()
                .accounts({
                    authority: adminKeypair.publicKey,
                    programConfig: programConfigAddress,
                    epochManagement: epochManagementAddress,
                })
                .signers([adminKeypair])
                .rpc();

            const epochAccount = await program.account.epochManagement.fetch(epochManagementAddress);
            expect(epochAccount.processed).to.be.true;
        });

        it("should prevent non_admin_authority from calling mark_epoch_processed and return Unauthorized error", async () => {
            try {
                await program.methods
                    .markEpochProcessed()
                    .accounts({
                        authority: nonAdminKeypair.publicKey,
                        programConfig: programConfigAddress,
                        epochManagement: epochManagementAddress,
                    })
                    .signers([nonAdminKeypair])
                    .rpc();
                expect.fail("Transaction should have failed with Unauthorized error");
            } catch (error) {
                expect((error as anchor.AnchorError).error.errorCode.code).to.equal("Unauthorized");
                expect((error as anchor.AnchorError).error.errorCode.number).to.equal(6023);
            }
        });
    });
});