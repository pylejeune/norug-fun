import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { generateRandomId, setupTestEnvironment } from "./utils.test";

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

  // --- Helper Function --- 
  async function setupClosedEpochWithProposal(epochId: anchor.BN, tokenName: string, tokenSymbol: string) {
    console.log(`\n--- Setting up Epoch ${epochId} & Proposal ${tokenName} ---`);
    const creator = provider.wallet;
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 10); // Start 10s ago
    const endTime = new anchor.BN(startTime.toNumber() + 5);      // End soon

    // Derive PDAs
    const [currentEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    const [currentProposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        creator.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    // Create Epoch (handle exists)
    try {
      await program.methods
        .startEpoch(epochId, startTime, endTime)
        .accounts({ authority: creator.publicKey, epochManagement: currentEpochPda, systemProgram: anchor.web3.SystemProgram.programId })
        .rpc();
      console.log(`Epoch ${epochId} created.`);
    } catch(err) { console.log(`Epoch ${epochId} likely already exists.`); }

    // Create Proposal (handle exists)
    try {
      await program.methods
        .createProposal(tokenName, tokenSymbol, new anchor.BN(1000), 5, new anchor.BN(0))
        .accounts({ creator: creator.publicKey, tokenProposal: currentProposalPda, epoch: currentEpochPda, systemProgram: anchor.web3.SystemProgram.programId })
        .rpc();
      console.log(`Proposal ${tokenName} created.`);
    } catch(err) { console.log(`Proposal ${tokenName} likely already exists.`); }

    // Wait for epoch end
    const waitTime = Math.max(0, endTime.toNumber() * 1000 - Date.now() + 1000); // Wait 1s past end time
    console.log(`Waiting ${waitTime / 1000}s for epoch to end...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));

    // Close Epoch (handle already closed)
    try {
      const epochState = await program.account.epochManagement.fetch(currentEpochPda);
      if (JSON.stringify(epochState.status) !== JSON.stringify({ closed: {} })) {
        await program.methods.endEpoch(epochId)
          .accounts({ epochManagement: currentEpochPda, authority: creator.publicKey, systemProgram: anchor.web3.SystemProgram.programId })
          .rpc();
        console.log(`Epoch ${epochId} closed.`);
      } else { console.log(`Epoch ${epochId} was already closed.`); }
    } catch(err) { console.log(`Failed to close epoch ${epochId} (may be already closed): ${err.message}`); }

    // Verify epoch is closed
    const closedEpoch = await program.account.epochManagement.fetch(currentEpochPda);
    expect(closedEpoch.status).to.deep.equal({ closed: {} });

    // Verify proposal is active
    const proposal = await program.account.tokenProposal.fetch(currentProposalPda);
    // Reset status to Active if needed for re-running tests cleanly
    if (JSON.stringify(proposal.status) !== JSON.stringify({ active: {} })) {
        console.warn(`Proposal ${tokenName} was not Active. Attempting reset via direct account write (TEST ONLY!).`);
        // THIS IS FOR TESTING ONLY - requires direct modification which isn't standard practice
        // In a real scenario, you wouldn't reset status like this.
        // A better test approach might involve creating unique proposals per test.
        // For now, we accept this limitation for simpler test code.
        // proposal.status = { active: {} }; // This line won't actually work as fetch returns a copy
        // Need to call an instruction (if one existed) or accept tests might fail on re-run without reset
         console.warn("Cannot reset proposal status easily in test. Subsequent tests might fail if run out of order or re-run without validator reset.");
         // We will proceed assuming the proposal *should* be active after creation.
         expect(proposal.status).to.deep.equal({ active: {} }, "Proposal status should be Active after creation");
    }

    console.log(`--- Setup complete for Epoch ${epochId} & Proposal ${tokenName} ---`);
    return { currentEpochPda, currentProposalPda };
  }
  // --- End Helper Function ---

  before(async () => {
    // Générer l'autorité admin de manière déterministe
    adminAuthority = Keypair.fromSeed(ADMIN_SEED); 
    console.log(`Admin authority (deterministic): ${adminAuthority.publicKey}`);

    // Financer cette autorité si nécessaire (une seule fois suffit)
    const balance = await provider.connection.getBalance(adminAuthority.publicKey);
    if (balance < 0.5 * LAMPORTS_PER_SOL) { // Financer si moins de 0.5 SOL
        await provider.connection.confirmTransaction(
            await provider.connection.requestAirdrop(adminAuthority.publicKey, 1 * LAMPORTS_PER_SOL),
            "confirmed"
        );
        console.log(`Admin authority ${adminAuthority.publicKey} funded.`);
    } else {
        console.log(`Admin authority ${adminAuthority.publicKey} already funded.`);
    }

    // Trouver l'adresse du PDA pour ProgramConfig
    [programConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    console.log(`ProgramConfig PDA: ${programConfigPda}`);
  });

  it("Initialise la configuration du programme (ProgramConfig)", async () => {
    console.log("\nTest: Initialisation ProgramConfig");
    console.log("---------------------------------------");
    try {
      const tx = await program.methods
        .initializeProgramConfig(adminAuthority.publicKey) // Passer la clé publique de l'admin souhaité
        .accounts({
          programConfig: programConfigPda,
          authority: provider.wallet.publicKey, // L'autorité qui paie et initialise (le wallet du provider ici)
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();
      console.log("Transaction signature:", tx);

      // Vérifier que le compte a été créé et contient la bonne autorité
      const configAccount = await program.account.programConfig.fetch(programConfigPda);
      console.log("Admin authority set in ProgramConfig:", configAccount.adminAuthority.toString());
      expect(configAccount.adminAuthority.toString()).to.equal(adminAuthority.publicKey.toString());

    } catch (error) {
      console.error("Erreur lors de l'initialisation de ProgramConfig:", error);
      // Essayer d'appeler une deuxième fois pour voir si l'erreur attendue se produit
      try {
        await program.methods
          .initializeProgramConfig(adminAuthority.publicKey)
          .accounts({
            programConfig: programConfigPda,
            authority: provider.wallet.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
          expect.fail("L'initialisation aurait dû échouer la deuxième fois");
      } catch (innerError) {
        console.log("Erreur attendue lors de la deuxième initialisation:", innerError.message);
        expect(innerError.message).to.include("Allocate: account Address { address: " + programConfigPda.toString()); // Anchor lève une erreur d'allocation
      }
      // Ne pas faire échouer le test si la première tentative a échoué car le compte existait déjà (runs précédents)
      console.log("L'initialisation a peut-être échoué car le compte existait déjà (normal si tests relancés).");
      // Re-vérifier que l'autorité est correcte dans ce cas
      const configAccount = await program.account.programConfig.fetch(programConfigPda);
      // S'assurer que l'autorité on-chain correspond à celle générée de manière déterministe
      if (!configAccount.adminAuthority.equals(adminAuthority.publicKey)) {
          console.warn("L'autorité admin on-chain ne correspond pas ! Tentative de mise à jour (nécessite une instruction set_admin_authority).");
          // Idéalement, appeler ici une instruction set_admin_authority si elle existait.
          // Pour l'instant, on lance une erreur si l'autorité n'est pas la bonne après l'initialisation potentielle.
          expect(configAccount.adminAuthority.equals(adminAuthority.publicKey), "L'autorité admin dans ProgramConfig ne correspond pas à la clé de test déterministe!").to.be.true;
      }
    }
  });

  it("Met à jour le statut d'une proposition vers Validated", async () => {
    console.log("\nTest: Update Proposal Status to Validated");
    console.log("---------------------------------------------");
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol);

    // --- Appel de l'instruction à tester --- 
    try {
      const tx = await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({
          authority: adminAuthority.publicKey,
          programConfig: programConfigPda,
          epochManagement: currentEpochPda,
          proposal: currentProposalPda,
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
    const epochId = generateRandomId(); // Utiliser un nouvel ID pour être sûr
    const tokenName = "rejectMe";
    const tokenSymbol = "REJ";
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol);

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
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol);

    // Générer une autorité non autorisée
    const unauthorizedAuthority = anchor.web3.Keypair.generate();
    // La financer (nécessaire pour signer/payer la transaction)
    const lamports = 0.1 * anchor.web3.LAMPORTS_PER_SOL;
    const signature = await provider.connection.requestAirdrop(unauthorizedAuthority.publicKey, lamports);
    await provider.connection.confirmTransaction(signature, "confirmed");
    console.log(`Unauthorized authority ${unauthorizedAuthority.publicKey} funded.`);

    try {
      await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({
          authority: unauthorizedAuthority.publicKey, // Utiliser la mauvaise clé publique
          programConfig: programConfigPda,
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
      expect(error.message).to.include("InvalidAuthority"); // Nouvelle vérification
      console.log("Vérifié que l'erreur contient 'InvalidAuthority'");

      // Vérifier que le statut de la proposition n'a pas changé
      const proposalAfter = await program.account.tokenProposal.fetch(currentProposalPda);
      expect(proposalAfter.status).to.deep.equal({ active: {} }, "Proposal status should not have changed");
    }
  });

  it("Échoue si l'époque n'est pas fermée (Closed)", async () => {
    console.log("\nTest: Failure when Epoch is not Closed");
    console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "epochActiveTest";
    const tokenSymbol = "EAT";
    const creator = provider.wallet;

    // 1. Créer une époque qui reste active (endTime loin dans le futur)
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 10);
    const endTime = new anchor.BN(startTime.toNumber() + 3600 * 24); // Fin dans 1 jour
    const [activeEpochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );
    try {
        await program.methods
          .startEpoch(epochId, startTime, endTime)
          .accounts({ authority: creator.publicKey, epochManagement: activeEpochPda, systemProgram: anchor.web3.SystemProgram.programId })
          .rpc();
        console.log(`Époque active ${epochId} créée.`);
    } catch(err) { console.log(`Époque active ${epochId} déjà existante (normal si tests relancés).`); }
    
    // Vérifier que l'époque est bien active
    const epochState = await program.account.epochManagement.fetch(activeEpochPda);
    expect(epochState.status).to.deep.equal({ active: {} });

    // 2. Créer une proposition dans cette époque active
    const [activeProposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        creator.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );
    try {
        await program.methods
          .createProposal(tokenName, tokenSymbol, new anchor.BN(1000), 5, new anchor.BN(0))
          .accounts({ creator: creator.publicKey, tokenProposal: activeProposalPda, epoch: activeEpochPda, systemProgram: anchor.web3.SystemProgram.programId })
          .rpc();
        console.log(`Proposition ${tokenName} créée dans l'époque active.`);
    } catch(err) { console.log(`Proposition ${tokenName} déjà existante (normal si tests relancés).`); }

    // 3. Tenter de mettre à jour le statut alors que l'époque est active
    try {
      await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({
          authority: adminAuthority.publicKey,
          programConfig: programConfigPda,
          epochManagement: activeEpochPda, // L'époque est active
          proposal: activeProposalPda,
        })
        .signers([adminAuthority])
        .rpc();

      expect.fail("L'appel aurait dû échouer car l'époque n'est pas fermée");
    } catch (error) {
      console.log("Erreur attendue interceptée:", error.message);
      expect(error.message).to.include("EpochNotClosed"); // Nouvelle vérification
      console.log("Vérifié que l'erreur contient 'EpochNotClosed'");

      // Vérifier que le statut de la proposition n'a pas changé
      const proposalAfter = await program.account.tokenProposal.fetch(activeProposalPda);
      expect(proposalAfter.status).to.deep.equal({ active: {} }, "Proposal status should remain Active");
    }
  });

  // --- Tests for preventing status change after finalization ---

  it("Échoue si on essaie de passer de Validated à Rejected", async () => {
    console.log("\nTest: Failure Validated -> Rejected");
    console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "alreadyValidated";
    const tokenSymbol = "ALV";
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol);

    // 1. Passer à Validated (vérifié dans un test précédent, on le fait ici comme setup)
    await program.methods
        .updateProposalStatus({ validated: {} })
        .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
        .signers([adminAuthority])
        .rpc();
    
    const validatedProposal = await program.account.tokenProposal.fetch(currentProposalPda);
    expect(validatedProposal.status).to.deep.equal({ validated: {} });

    // 2. Tenter de passer à Rejected
    try {
        await program.methods
          .updateProposalStatus({ rejected: {} }) // Tenter de changer
          .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
          .signers([adminAuthority])
          .rpc();
        expect.fail("L'appel aurait dû échouer car la proposition est déjà Validated");
    } catch (error) {
        console.log("Erreur attendue interceptée:", error.message);
        // Vérifier l'erreur spécifique ProposalAlreadyFinalized
        expect(error.message).to.include("ProposalAlreadyFinalized"); 
        // Ou vérifier le code d'erreur si possible
        // expect(error.error.errorCode.code).to.equal("ProposalAlreadyFinalized");
        // expect(error.error.errorCode.number).to.equal(6015); // A vérifier
    }
  });

  it("Échoue si on essaie de passer de Rejected à Validated", async () => {
    console.log("\nTest: Failure Rejected -> Validated");
    console.log("---------------------------------------------");
    const epochId = generateRandomId();
    const tokenName = "alreadyRejected";
    const tokenSymbol = "ALR";
    const { currentEpochPda, currentProposalPda } = await setupClosedEpochWithProposal(epochId, tokenName, tokenSymbol);

    // 1. Passer à Rejected (vérifié dans un test précédent, on le fait ici comme setup)
    await program.methods
        .updateProposalStatus({ rejected: {} })
        .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
        .signers([adminAuthority])
        .rpc();

    const rejectedProposal = await program.account.tokenProposal.fetch(currentProposalPda);
    expect(rejectedProposal.status).to.deep.equal({ rejected: {} });

    // 2. Tenter de passer à Validated
    try {
        await program.methods
          .updateProposalStatus({ validated: {} }) // Tenter de changer
          .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: currentEpochPda, proposal: currentProposalPda })
          .signers([adminAuthority])
          .rpc();
        expect.fail("L'appel aurait dû échouer car la proposition est déjà Rejected");
    } catch (error) {
        console.log("Erreur attendue interceptée:", error.message);
        expect(error.message).to.include("ProposalAlreadyFinalized");
        // expect(error.error.errorCode.code).to.equal("ProposalAlreadyFinalized");
        // expect(error.error.errorCode.number).to.equal(6015);
    }
  });

}); 