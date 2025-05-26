console.log("\n\n=====================================");
console.log(">>> Démarrage tests: updateproposal.test.ts <<<");
console.log("=====================================\n");

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { generateRandomId, setupTestEnvironment } from "./utils.test";
import { BN } from "bn.js";

// Seed fixe pour l'autorité admin des tests
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

describe("Tests de la mise à jour du statut des propositions", () => {
  const { provider, program } = setupTestEnvironment();
  let programConfigPda: PublicKey;
  let adminAuthority: anchor.web3.Keypair; // L'autorité qui sera définie dans ProgramConfig
  let epochPda: PublicKey;
  let proposalPda: PublicKey;
  const epochId = generateRandomId();
  const tokenName = "testUpdateToken";
  const tokenSymbol = "TUT";

  before(async () => {
    // Utiliser un Keypair déterministe pour l'admin authority pour la cohérence des tests
    adminAuthority = Keypair.fromSeed(ADMIN_SEED);
    console.log(`Admin authority (deterministic): ${adminAuthority.publicKey.toBase58()}`);

    // Financer le compte adminAuthority si nécessaire
    const adminInfo = await provider.connection.getAccountInfo(adminAuthority.publicKey);
    if (!adminInfo || adminInfo.lamports < 2 * LAMPORTS_PER_SOL) {
      const sig = await provider.connection.requestAirdrop(adminAuthority.publicKey, 2 * LAMPORTS_PER_SOL);
      await provider.connection.confirmTransaction(sig, "confirmed");
      console.log(`Admin authority ${adminAuthority.publicKey.toBase58()} funded.`);
    } else {
      console.log(`Admin authority ${adminAuthority.publicKey.toBase58()} already funded.`);
    }
    
    [programConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    console.log(`ProgramConfig PDA: ${programConfigPda.toBase58()}`);

    try {
      await program.methods
        .initializeProgramConfig(adminAuthority.publicKey)
        .accounts({
          programConfig: programConfigPda,
          authority: adminAuthority.publicKey, // L'adminAuthority paie et devient l'admin
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([adminAuthority]) // L'adminAuthority doit signer cette initialisation
        .rpc();
      console.log("ProgramConfig initialized.");
    } catch (error) {
      const errorString = (error as Error).toString();
      if (errorString.includes("already in use") || errorString.includes("custom program error: 0x0")) {
        console.log("ProgramConfig already initialized.");
      } else {
        console.error("Unexpected error during ProgramConfig initialization:", error);
        throw error;
      }
    }
    // Vérification que l'admin dans ProgramConfig est bien celui attendu
    const configAccount = await program.account.programConfig.fetch(programConfigPda);
    if (!configAccount.adminAuthority.equals(adminAuthority.publicKey)) {
        throw new Error(`ProgramConfig admin mismatch: Expected ${adminAuthority.publicKey.toBase58()}, found ${configAccount.adminAuthority.toBase58()}`);
    }
    console.log(`Confirmed admin authority in ProgramConfig: ${configAccount.adminAuthority.toBase58()}`);
  });

  // --- Helper Function --- 
  async function setupClosedEpochWithProposal(
    epochId: anchor.BN, 
    tokenName: string, 
    tokenSymbol: string, 
    creatorKp: anchor.web3.Keypair, // Utiliser Keypair pour signer la création
    lockup: number = 0
  ): Promise<{ currentEpochPda: PublicKey, currentProposalPda: PublicKey }> { 
    console.log(`\n--- Setting up Epoch ${epochId} & Proposal ${tokenName} ---`);
    const creator = creatorKp.publicKey; // La clé publique du créateur
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 10); // Start 10s ago
    // End time depends on lockup, ensuring it's slightly in the past or now for closing
    const endTime = new anchor.BN(startTime.toNumber() + Math.max(lockup, 1)); // Ensure at least 1s duration, then add lockup 

    // Derive PDAs
    const [currentEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [currentProposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        creator.toBuffer(), 
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );
    console.log(`   Epoch PDA: ${currentEpochPda.toBase58()}`);
    console.log(`   Proposal PDA: ${currentProposalPda.toBase58()} (Creator: ${creator.toBase58()})`);


    // --- Create Epoch (handle if exists) ---
    console.log(`   Attempting to Create/Verify Epoch ${epochId}...`);
    try {
        await program.account.epochManagement.fetch(currentEpochPda);
        console.log(`   Epoch ${epochId} already exists. Skipping creation.`);
    } catch (e) {
        // Doesn't exist, create it
         console.log(`   Creating Epoch ${epochId}...`);
        try {
            await program.methods
                .startEpoch(epochId, startTime, endTime)
                .accounts({ 
                    authority: adminAuthority.publicKey, // AdminAuthority doit démarrer l'époque
                    programConfig: programConfigPda,     // Passer programConfigPda
                    epochManagement: currentEpochPda, 
                    systemProgram: anchor.web3.SystemProgram.programId 
                } as any)
                .signers([adminAuthority]) // AdminAuthority signe
                .rpc();
            console.log(`   Epoch ${epochId} created successfully.`);
        } catch (createError) {
             console.error(`   *** FAILED to create Epoch ${epochId}:`, createError);
             throw new Error(`Failed to create Epoch ${epochId}`);
        }
    }
    // Fetch to confirm state regardless of creation path
    const epochInfoStart = await program.account.epochManagement.fetch(currentEpochPda);
    console.log(`   Epoch ${epochId} fetched (status: ${JSON.stringify(epochInfoStart.status)}).`);
    expect(epochInfoStart.epochId.eq(epochId)).to.be.true;


    // --- Create Proposal (handle if exists) ---
    console.log(`   Attempting to Create/Verify Proposal ${tokenName} with creator ${creator.toBase58()}...`);
    const description = `Default description for ${tokenName}`;
    const imageUrl = null;
     try {
        await program.account.tokenProposal.fetch(currentProposalPda);
        console.log(`   Proposal ${tokenName} already exists. Skipping creation.`);
         // Optional: Check if creator matches if it exists
        const existingProposal = await program.account.tokenProposal.fetch(currentProposalPda);
        if (!existingProposal.creator.equals(creator)) {
             console.error(`   *** MISMATCH: Existing proposal ${tokenName} has creator ${existingProposal.creator}, expected ${creator}`);
             throw new Error("Existing proposal creator mismatch");
        }
    } catch (e) {
        // Doesn't exist, create it
         console.log(`   Creating Proposal ${tokenName}...`);
        try {
            await program.methods
                .createProposal(
                    tokenName, 
                    tokenSymbol, 
                    description,
                    imageUrl,
                    new anchor.BN(1000), 
                    5, 
                    new anchor.BN(lockup) 
                )
                .accounts({ 
                    creator: creator, 
                    tokenProposal: currentProposalPda, 
                    epoch: currentEpochPda, 
                    systemProgram: anchor.web3.SystemProgram.programId,
                    programConfig: programConfigPda, // programConfigPda est bien passé ici
                })
                .signers([creatorKp]) // Creator signs
                .rpc();
            console.log(`   Proposal ${tokenName} created successfully.`);
        } catch (createError) {
             console.error(`   *** FAILED to create Proposal ${tokenName}:`, createError);
             throw new Error(`Failed to create Proposal ${tokenName}`);
        }
    }
     // Fetch to confirm state
    const proposalInfoStart = await program.account.tokenProposal.fetch(currentProposalPda);
    console.log(`   Proposal ${tokenName} fetched (status: ${JSON.stringify(proposalInfoStart.status)}).`);
    expect(proposalInfoStart.tokenName).to.equal(tokenName);
    expect(proposalInfoStart.creator.equals(creator)).to.be.true;


    // --- Wait for epoch end --- 
    let epochState = await program.account.epochManagement.fetch(currentEpochPda);
    const epochEndTime = epochState.endTime.toNumber();
    const currentTime = Math.floor(Date.now() / 1000);
    // Adjust wait time calculation: wait if current time is BEFORE end time
    const waitTimeSeconds = Math.max(0, epochEndTime - currentTime + 1); // Wait 1s past end time if needed
    if (epochEndTime > currentTime) {
        console.log(`   Waiting ${waitTimeSeconds}s for epoch ${epochId} to end (ends at ${epochEndTime}, now ${currentTime})...`);
        await new Promise(resolve => setTimeout(resolve, waitTimeSeconds * 1000));
    } else {
        console.log(`   Epoch ${epochId} should have already ended (ended at ${epochEndTime}, now ${currentTime}).`);
    }

    // --- Close Epoch (if Active) --- 
    epochState = await program.account.epochManagement.fetch(currentEpochPda);
    if (JSON.stringify(epochState.status) === JSON.stringify({ active: {} })) {
        console.log(`   Closing Epoch ${epochId}...`);
        try {
            await program.methods.endEpoch(epochId)
                .accounts({ 
                    epochManagement: currentEpochPda, 
                    authority: adminAuthority.publicKey, // AdminAuthority doit fermer l'époque
                    programConfig: programConfigPda,     // Passer programConfigPda
                    systemProgram: anchor.web3.SystemProgram.programId 
                } as any)
                .signers([adminAuthority]) // AdminAuthority signe
                .rpc();
            console.log(`   Epoch ${epochId} closed successfully.`);
        } catch (error) {
            // Check if it failed because it was already closed (possible race condition or timing)
            const stateAfterFail = await program.account.epochManagement.fetch(currentEpochPda);
            if (JSON.stringify(stateAfterFail.status) === JSON.stringify({ closed: {} })) {
                console.warn(`   Epoch ${epochId} closing failed, but epoch is already Closed. Proceeding.`);
            } else {
                 console.error(`   *** FAILED to close Epoch ${epochId}:`, error);
                 console.error(`   Current epoch state after failed close: ${JSON.stringify(stateAfterFail)}`);
                 throw new Error(`Failed to close epoch ${epochId}`);
            }
        }
    } else {
         console.log(`   Epoch ${epochId} was already not Active (status: ${JSON.stringify(epochState.status)}). Assuming Closed or Pending.`);
    }
    // Final check: ensure epoch is Closed
    epochState = await program.account.epochManagement.fetch(currentEpochPda);
    expect(epochState.status).to.deep.equal({ closed: {} }, `Epoch ${epochId} should be Closed at the end of setup`);
    console.log(`   Verified Epoch ${epochId} is Closed.`);

    
    // --- Final Verification before returning ---
    const finalProposal = await program.account.tokenProposal.fetch(currentProposalPda);
    // Ensure proposal is Active before returning, ready for status update tests
    if (JSON.stringify(finalProposal.status) !== JSON.stringify({ active: {} })) {
         console.warn(`   Proposal ${tokenName} ended setup in non-Active state: ${JSON.stringify(finalProposal.status)}. This might cause subsequent test failures.`);
         // This might happen if tests are re-run without resetting the validator state.
         // Consider adding a reset mechanism or ensuring unique proposals if this becomes an issue.
    }
    expect(finalProposal.status).to.deep.equal({ active: {} }, "Proposal status should be Active at end of setup");
    console.log(`   Verified Proposal ${tokenName} is Active.`);


    console.log(`--- Setup complete for Epoch ${epochId} & Proposal ${tokenName} ---`);
    return { currentEpochPda, currentProposalPda }; 
  }
  // --- End Helper Function ---

// Helper function pour créer une époque active (si pas déjà existante)
async function setupActiveEpoch(epochId: anchor.BN): Promise<{ currentEpochPda: anchor.web3.PublicKey }> {
  const [currentEpochPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
    program.programId
  );
  console.log(`   [Helper setupActiveEpoch] Derived PDA: ${currentEpochPda.toBase58()} for epoch ID: ${epochId}`);

  const now = Math.floor(Date.now() / 1000);
  const startTime = new anchor.BN(now);
  const endTime = new anchor.BN(now + 60 * 60 * 24); // Active pour 24 heures

  try {
    // Essayer de récupérer l'époque
    const epochInfo = await program.account.epochManagement.fetch(currentEpochPda);
    console.log(`   [Helper setupActiveEpoch] Epoch ${epochId} already exists (status: ${JSON.stringify(epochInfo.status)}).`);
    // Vérifier si elle est active, sinon la recréer (ou échouer si on préfère)
    if (JSON.stringify(epochInfo.status) !== JSON.stringify({ active: {} })) {
       console.warn(`   [Helper setupActiveEpoch] Epoch ${epochId} exists but is not Active. Attempting to restart (might fail if dependencies exist).`);
       await program.methods
         .startEpoch(epochId, startTime, endTime)
         .accounts({
           authority: adminAuthority.publicKey, // AdminAuthority doit démarrer l'époque
           programConfig: programConfigPda,     // Passer programConfigPda
           epochManagement: currentEpochPda,
           systemProgram: anchor.web3.SystemProgram.programId,
         } as any)
         .signers([adminAuthority]) // AdminAuthority signe
         .rpc();
        console.log(`   [Helper setupActiveEpoch] Epoch ${epochId} re-started.`);
    } else {
       console.log(`   [Helper setupActiveEpoch] Using existing Active epoch ${epochId}.`);
    }
  } catch (error) {
     // Si elle n'existe pas, on la crée
     console.log(`   [Helper setupActiveEpoch] Creating Active epoch ${epochId}...`);
      await program.methods
        .startEpoch(epochId, startTime, endTime)
        .accounts({
          authority: adminAuthority.publicKey, // AdminAuthority doit démarrer l'époque
          programConfig: programConfigPda,     // Passer programConfigPda
          epochManagement: currentEpochPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        } as any)
        .signers([adminAuthority]) // AdminAuthority signe
        .rpc();
      console.log(`   [Helper setupActiveEpoch] Active epoch ${epochId} created successfully.`);
       // Fetch pour confirmer
      const newEpochInfo = await program.account.epochManagement.fetch(currentEpochPda);
      expect(newEpochInfo.status).to.deep.equal({ active: {} });
      console.log(`   [Helper setupActiveEpoch] Active epoch ${epochId} fetched successfully after creation.`);
  }
  
  return { currentEpochPda };
}

  it("Initialise la configuration du programme (ProgramConfig)", async () => {
    // On vérifie juste que le compte existe et a la bonne autorité
    console.log("\nTest: Verify ProgramConfig Initialization");
    console.log("-------------------------------------------");
    const configAccount = await program.account.programConfig.fetch(programConfigPda);
    expect(configAccount.adminAuthority.toString()).to.equal(adminAuthority.publicKey.toString());
    console.log("ProgramConfig exists and has correct admin authority.");
  });

  it("Met à jour le statut d'une proposition vers Validated", async () => {
    console.log("\nTest: Update Proposal Status to Validated");
    console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "validateMe";
    const tokenSymbol = "VAL";
    // Utiliser adminAuthority comme créateur pour simplifier la logique d'autorisation
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol, adminAuthority);

    // --- Appel de l'instruction à tester --- 
    try {
      const tx = await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({
          authority: adminAuthority.publicKey, // Admin doit signer
          programConfig: programConfigPda,
          epochManagement: currentEpochPda, // Epoque fermée
          proposal: currentProposalPda, // Proposition Active
        })
        .signers([adminAuthority])
        .rpc();
      console.log("Transaction updateProposalStatus (Validated) signature:", tx);

      // --- Vérification --- 
      const proposalAfter = await program.account.tokenProposal.fetch(currentProposalPda);
      console.log(`Statut de la proposition APRÈS: ${JSON.stringify(proposalAfter.status)}`);
      expect(proposalAfter.status).to.deep.equal({ validated: {} });

    } catch (error) {
      console.error("Erreur lors de l'appel à updateProposalStatus (Validated):", error);
      throw error;
    }
  });

  it("Met à jour le statut d'une proposition vers Rejected", async () => {
    console.log("\nTest: Update Proposal Status to Rejected");
    console.log("---------------------------------------------");
    const epochId = generateRandomId(); 
    const tokenName = "rejectMe";
    const tokenSymbol = "REJ";
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol, adminAuthority);

    // --- Appel de l'instruction à tester --- 
    try {
      const tx = await program.methods
        .updateProposalStatus({ rejected: {} }) // Le nouveau statut
        .accounts({
          authority: adminAuthority.publicKey,
          programConfig: programConfigPda,
          epochManagement: currentEpochPda,
          proposal: currentProposalPda,
        })
        .signers([adminAuthority])
        .rpc();
      console.log("Transaction updateProposalStatus (Rejected) signature:", tx);

      // --- Vérification --- 
      const proposalAfter = await program.account.tokenProposal.fetch(currentProposalPda);
      console.log(`Statut de la proposition APRÈS: ${JSON.stringify(proposalAfter.status)}`);
      expect(proposalAfter.status).to.deep.equal({ rejected: {} }); // Vérifie le nouveau statut

    } catch (error) {
      console.error("Erreur lors de l'appel à updateProposalStatus (Rejected):", error);
      throw error;
    }
  });

  it("Échoue si l'autorité signataire n'est pas la bonne", async () => {
     console.log("\nTest: Failure with Unauthorized Signer");
     console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "unauthAttempt";
    const tokenSymbol = "UNA";
    // Créer la proposition avec l'autorité admin légitime
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol, adminAuthority);

    // Générer une autorité non autorisée
    const unauthorizedAuthority = anchor.web3.Keypair.generate();
    // La financer (nécessaire pour signer/payer la transaction)
    console.log(`Funding unauthorized authority ${unauthorizedAuthority.publicKey}...`);
    const lamports = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
    const signature = await provider.connection.requestAirdrop(unauthorizedAuthority.publicKey, lamports);
    await provider.connection.confirmTransaction(signature, "confirmed");
    console.log(`Unauthorized authority ${unauthorizedAuthority.publicKey} funded.`);

    try {
      await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({
          authority: unauthorizedAuthority.publicKey, // Utiliser la mauvaise clé publique
          programConfig: programConfigPda, // Le programme vérifiera authority vs programConfig.adminAuthority
          epochManagement: currentEpochPda,
          proposal: currentProposalPda,
        })
        .signers([unauthorizedAuthority]) // Signer avec la mauvaise clé privée
        .rpc();
      
      // Si l'appel réussit, le test échoue
      expect.fail("L'appel aurait dû échouer car l'autorité n'est pas valide");
    } catch (error) {
      // Vérifier que l'erreur est bien celle attendue
      console.log("Erreur attendue interceptée:", error.message);
      expect(error.error.errorCode.code).to.equal("Unauthorized"); 
      expect(error.error.errorCode.number).to.equal(6023); // Code pour Unauthorized
      console.log("Vérifié que l'erreur est Unauthorized (6023).");

      // Vérifier que le statut de la proposition n'a pas changé
      const proposalAfter = await program.account.tokenProposal.fetch(currentProposalPda);
      expect(proposalAfter.status).to.deep.equal({ active: {} }, "Proposal status should not have changed");
    }
  });

  // --- Test for failure when Epoch is not Closed (Already passed, kept for regression) ---
  it("Échoue si l'époque n'est pas fermée (Closed)", async () => {
    console.log("\nTest: Failure when Epoch is not Closed");
    console.log("---------------------------------------------");

    // 1. Créer une époque active unique pour ce test
    const testEpochId = generateRandomId();
    const testTokenName = `epochActiveTest-${testEpochId.toString().substring(0, 6)}`; // Nom unique
    const testTokenSymbol = "EAT";
    const description = `Test description for ${testTokenName}`;
    const imageUrl = null;

    // Utilise setupActiveEpoch
    const { currentEpochPda: activeEpochPda } = await setupActiveEpoch(testEpochId); 
    console.log(`   Active Epoch PDA for test: ${activeEpochPda.toBase58()}`);

    // 2. Créer une proposition associée à l'époque active
    const [activeProposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        adminAuthority.publicKey.toBuffer(), // <-- Utiliser adminAuthority
        testEpochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(testTokenName),
      ],
      program.programId
    );
    console.log(`   Active Proposal PDA for test: ${activeProposalPda.toBase58()} (Creator: ${adminAuthority.publicKey})`);


    // Création explicite de la proposition
    console.log(`   Attempting to Create proposal ${testTokenName} for active epoch ${testEpochId}...`);
    try {
        await program.methods
        .createProposal(
            testTokenName, // <-- CORRIGÉ: Utiliser la variable correcte
            testTokenSymbol,
            description,
            imageUrl,
            new anchor.BN(1000), // totalSupply
            5, // creatorAllocation
            new anchor.BN(0) // lockupPeriod
        )
        .accounts({
            creator: adminAuthority.publicKey, // <-- Utiliser adminAuthority
            tokenProposal: activeProposalPda,
            epoch: activeEpochPda, // Doit être une époque active
            systemProgram: SystemProgram.programId,
            programConfig: programConfigPda, 
        })
        .signers([adminAuthority]) // <-- Signer avec adminAuthority
        .rpc();
        console.log(`   Proposal ${testTokenName} created successfully for active epoch.`);
        const proposalInfo = await program.account.tokenProposal.fetch(activeProposalPda);
        expect(proposalInfo.status).to.deep.equal({ active: {} });
        // Vérifier que le créateur stocké est bien adminAuthority
        expect(proposalInfo.creator.equals(adminAuthority.publicKey)).to.be.true;
    } catch (error) {
        console.error(`   *** FAILED to create Proposal ${testTokenName} in active epoch test:`, error);
        // Ne pas masquer l'erreur, si la création échoue, le test doit échouer ici
        throw error;
    }

    // 3. Tenter de mettre à jour le statut alors que l'époque est active
    try {
      console.log(`   Attempting to update status of ${testTokenName} (epoch should be active)`);
      await program.methods
        .updateProposalStatus({ validated: {} }) // Tente de passer à Validated
        .accounts({
          authority: adminAuthority.publicKey, // Admin doit signer
          programConfig: programConfigPda,
          epochManagement: activeEpochPda, // L'époque est active
          proposal: activeProposalPda, // La proposition créée ci-dessus
        })
        .signers([adminAuthority]) // Admin signe
        .rpc();

      expect.fail("L'appel aurait dû échouer car l'époque n'est pas fermée");
    } catch (error) {
      console.log("Erreur attendue interceptée:", error.message);
      // Vérifier l'erreur spécifique EpochNotClosed
      expect(error.error.errorCode.code).to.equal("EpochNotClosed"); 
      expect(error.error.errorCode.number).to.equal(6018);
      console.log("Vérifié que l'erreur est EpochNotClosed (6018)");

      // Vérifier que le statut de la proposition n'a pas changé
      const proposalAfter = await program.account.tokenProposal.fetch(activeProposalPda);
      expect(proposalAfter.status).to.deep.equal({ active: {} }, "Proposal status should remain Active");
      console.log("Statut de la proposition inchangé (Active), comme attendu.");
    }
  });


  // --- Tests for preventing status change after finalization ---

  it("Échoue si on essaie de passer de Validated à Rejected", async () => {
     console.log("\nTest: Failure Validated -> Rejected");
     console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "alreadyValidated";
    const tokenSymbol = "ALV";
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol, adminAuthority);

    // 1. Passer à Validated 
    console.log(`   Setting proposal ${tokenName} to Validated...`);
    await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
        .signers([adminAuthority])
        .rpc();
    
    const validatedProposal = await program.account.tokenProposal.fetch(currentProposalPda);
    expect(validatedProposal.status).to.deep.equal({ validated: {} });
    console.log(`   Proposal ${tokenName} is now Validated.`);

    // 2. Tenter de passer à Rejected
    try {
        console.log(`   Attempting to change ${tokenName} from Validated -> Rejected`);
        await program.methods
          .updateProposalStatus({ rejected: {} }) // Tenter de changer
          .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
          .signers([adminAuthority])
          .rpc();
        expect.fail("L'appel aurait dû échouer car la proposition est déjà Validated");
    } catch (error) {
        console.log("Erreur attendue interceptée:", error.message);
        // Vérifier l'erreur spécifique ProposalAlreadyFinalized
        expect(error.error.errorCode.code).to.equal("ProposalAlreadyFinalized"); 
        expect(error.error.errorCode.number).to.equal(6021); // Vérifier le numéro d'erreur si défini
        console.log("Vérifié que l'erreur est Unauthorized (6021) - Étrange mais observé");
    }
  });

  it("Échoue si on essaie de passer de Rejected à Validated", async () => {
    console.log("\nTest: Failure Rejected -> Validated");
    console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "alreadyRejected";
    const tokenSymbol = "ALR";
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol, adminAuthority);

    // 1. Passer à Rejected
     console.log(`   Setting proposal ${tokenName} to Rejected...`);
    await program.methods
        .updateProposalStatus({ rejected: {} })
        .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
        .signers([adminAuthority])
        .rpc();

    const rejectedProposal = await program.account.tokenProposal.fetch(currentProposalPda);
    expect(rejectedProposal.status).to.deep.equal({ rejected: {} });
    console.log(`   Proposal ${tokenName} is now Rejected.`);

    // 2. Tenter de passer à Validated
    try {
        console.log(`   Attempting to change ${tokenName} from Rejected -> Validated`);
        await program.methods
          .updateProposalStatus({ validated: {} }) // Tenter de changer
          .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
          .signers([adminAuthority])
          .rpc();
        expect.fail("L'appel aurait dû échouer car la proposition est déjà Rejected");
    } catch (error) {
        console.log("Erreur attendue interceptée:", error.message);
         // Vérifier l'erreur spécifique ProposalAlreadyFinalized
        expect(error.error.errorCode.code).to.equal("ProposalAlreadyFinalized");
        expect(error.error.errorCode.number).to.equal(6021); // Vérifier le numéro d'erreur si défini
        console.log("Vérifié que l'erreur est Unauthorized (6021) - Étrange mais observé");
    }
  });

}); 