console.log("\n\n=====================================");
console.log(">>> Démarrage tests: crank_simulation.test.ts <<<");
console.log("=====================================\n");

// crank_simulation.test.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs"; // Ajuster le chemin si nécessaire
import { PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";
import { generateRandomId, setupTestEnvironment } from "./utils.test"; // Assumer que setupTestEnvironment est bien exporté

// Seed fixe pour l'autorité admin des tests (utiliser la même que dans updateproposal.test.ts)
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

describe("Simulation du traitement d'époque par le Crank", () => {
  const { provider, program } = setupTestEnvironment();
  let adminAuthority: Keypair;
  let programConfigPda: PublicKey;
  let treasuryPda: PublicKey; // Ajout de la variable pour le PDA de la trésorerie
  const testEpochId = generateRandomId(); // ID unique pour cette suite de tests

  before(async () => {
    // --- Initialisation de ProgramConfig (similaire à updateproposal.test.ts) ---
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

    [programConfigPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    // Initialiser ProgramConfig (gérer si déjà existant)
    try {
      await program.methods
        .initializeProgramConfig(adminAuthority.publicKey)
        .accounts({
          programConfig: programConfigPda,
          authority: adminAuthority.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([adminAuthority])
        .rpc();
      
      // Vérification immédiate après l'initialisation
      const fetchedConfig = await program.account.programConfig.fetch(programConfigPda);
      if (!fetchedConfig.adminAuthority.equals(adminAuthority.publicKey)) {
        throw new Error(`ProgramConfig admin authority mismatch after init: Expected ${adminAuthority.publicKey.toBase58()}, Found ${fetchedConfig.adminAuthority.toBase58()}`);
      }
      console.log("ProgramConfig initialisé et vérifié pour la simulation Crank.");

    } catch (error) {
      const errorString = (error as Error).toString();
      if (errorString.includes("already in use") || 
          errorString.includes("custom program error: 0x0") ||
          errorString.includes("AccountOwnedByWrongProgram") ||
          errorString.includes("Program account already initialized")) {
        console.log("ProgramConfig déjà initialisé. Vérification de l'autorité admin...");
        const config = await program.account.programConfig.fetch(programConfigPda);
        if (!config.adminAuthority.equals(adminAuthority.publicKey)) {
            throw new Error(`L'autorité admin dans ProgramConfig (${config.adminAuthority.toBase58()}) ne correspond pas à la clé de test déterministe (${adminAuthority.publicKey.toBase58()})!`);
        }
        console.log("Autorité admin de ProgramConfig vérifiée.");
      } else {
        console.error("Erreur inattendue durant l'initialisation de ProgramConfig dans crank_simulation.test.ts:", error);
        throw error; // Relancer les erreurs inattendues
        }
    }
     // --- Fin Initialisation ProgramConfig ---

    // --- Initialisation de Treasury ---
    [treasuryPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("treasury")],
      program.programId
    );
    try {
      await program.methods
        .initializeTreasury(provider.wallet.publicKey) // Utiliser le portefeuille du provider comme autorité
        .accounts({
          treasury: treasuryPda,
          authority: provider.wallet.publicKey, // Le payeur est aussi l'autorité ici
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      console.log("Treasury initialisé pour la simulation Crank.");
    } catch (e) {
      console.log("Treasury probablement déjà initialisé.");
      // Optionnel : vérifier l'autorité si nécessaire, mais moins critique ici que pour ProgramConfig
      const treasuryAccount = await program.account.treasury.fetch(treasuryPda);
      if (!treasuryAccount.authority.equals(provider.wallet.publicKey)) {
        console.warn("L'autorité de la trésorerie on-chain ne correspond pas à provider.wallet.publicKey !");
      }
    }
    // --- Fin Initialisation Treasury ---
  });

  it("devrait traiter une époque avec >10 propositions, trier, et mettre à jour les statuts correctement", async () => {
    console.log(`\n--- Test Complet Simulation Crank pour Epoch ${testEpochId} ---`);
    const numberOfProposals = 12; // Tester avec plus de 10
    const proposalsData: { pda: PublicKey; initialSupport: anchor.BN, name: string }[] = [];
    let epochPda: PublicKey;

    // --- 1. Setup: Créer Époque et Propositions ---
    console.log("   1. Création de l'époque et des propositions...");
    // Créer l'époque (avec endTime dans le passé pour la clôturer facilement)
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000) - 60); // Commencée il y a 1 min
    const endTime = new anchor.BN(startTime.toNumber() + 30);      // Finie il y a 30s
    [epochPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), testEpochId.toArrayLike(Buffer, "le", 8)],
        program.programId
    );
    await program.methods.startEpoch(testEpochId, startTime, endTime)
        .accounts({ 
          authority: adminAuthority.publicKey,
          programConfig: programConfigPda,
          epochManagement: epochPda, 
          systemProgram: SystemProgram.programId 
        })
        .signers([adminAuthority])
        .rpc();
    console.log(`      Époque ${testEpochId} créée.`);

    // Créer les propositions
    for (let i = 0; i < numberOfProposals; i++) {
        const tokenName = `CrankSim ${i}`;
        const tokenSymbol = `CS${i}`;
        // Donner un support initial différent pour tester le tri
        const initialSupport = new anchor.BN((numberOfProposals - i) * LAMPORTS_PER_SOL * 0.01); // Montants faibles pour le test

        const [pda] = PublicKey.findProgramAddressSync(
            [Buffer.from("proposal"), provider.wallet.publicKey.toBuffer(), testEpochId.toArrayLike(Buffer, "le", 8), Buffer.from(tokenName)],
            program.programId
        );
        proposalsData.push({ pda, initialSupport, name: tokenName });

        // Ajout de description et imageUrl
        const description = `Description for ${tokenName}`;
        const imageUrl = null; // ou une URL de test si besoin

        await program.methods.createProposal(
            tokenName, 
            tokenSymbol, 
            description, // Ajout argument
            imageUrl,    // Ajout argument
            new anchor.BN(1000), 
            5, 
            new anchor.BN(0)
            )
            .accounts({ 
              creator: provider.wallet.publicKey, 
              tokenProposal: pda, 
              epoch: epochPda, 
              treasury: treasuryPda, // Ajout du compte treasury
              systemProgram: SystemProgram.programId 
            })
            .rpc();
    }
    console.log(`      ${numberOfProposals} propositions créées.`);

    // --- 2. Setup: Supporter les propositions ---
    console.log("   2. Ajout de support aux propositions...");
    // Créer un supporter différent pour éviter les conflits sur UserSupport PDA si on utilise le même wallet
    const supporter = Keypair.generate();
     await provider.connection.confirmTransaction(
        await provider.connection.requestAirdrop(supporter.publicKey, 1 * LAMPORTS_PER_SOL),
        "confirmed"
    );

    for (const propData of proposalsData) {
         const [userSupportPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("support"), testEpochId.toArrayLike(Buffer, "le", 8), supporter.publicKey.toBuffer(), propData.pda.toBuffer()],
            program.programId
        );
        if (propData.initialSupport.gtn(0)) { // Ne pas appeler si support = 0
            await program.methods.supportProposal(propData.initialSupport)
                .accounts({
                    user: supporter.publicKey,
                    epoch: epochPda,
                    proposal: propData.pda,
                    userSupport: userSupportPda,
                    treasury: treasuryPda, // Ajout du compte treasury
                    systemProgram: SystemProgram.programId,
                })
                .signers([supporter]) // Le supporter signe
                .rpc();
        }
    }
    console.log(`      Support ajouté aux propositions.`);

    // --- 3. Setup: Fermer l'époque ---
    console.log("   3. Fermeture de l'époque...");
    await new Promise(resolve => setTimeout(resolve, 2000)); // Petite pause pour être sûr que endTime est passé
    try {
        await program.methods.endEpoch(testEpochId)
          .accounts({ 
            authority: adminAuthority.publicKey,
            programConfig: programConfigPda,
            epochManagement: epochPda, 
            systemProgram: SystemProgram.programId 
          })
          .signers([adminAuthority])
          .rpc();
        console.log(`      Époque ${testEpochId} fermée.`);
    } catch (e) { console.error("Erreur fermeture époque:", e)} 
    // Vérifier que l'époque est fermée et non traitée
    const closedEpoch = await program.account.epochManagement.fetch(epochPda);
    expect(closedEpoch.status).to.deep.equal({ closed: {} });
    expect(closedEpoch.processed).to.be.false; 

    // --- 4. Simulation Crank (Logique Off-chain dans le test) ---
    console.log("   4. Simulation de la logique Crank (fetch, sort)...");
    // Récupérer toutes les propositions de l'époque
    const allProposals = await program.account.tokenProposal.all([
        { memcmp: { offset: 8, bytes: anchor.utils.bytes.bs58.encode(testEpochId.toBuffer("le", 8)) } } 
    ]);
    expect(allProposals.length).to.equal(numberOfProposals);

    // Trier par solRaised (décroissant) - c'est la logique clé du Crank
    allProposals.sort((a, b) => b.account.solRaised.cmp(a.account.solRaised));

    // Déterminer les PDAs Validated (top 10) et Rejected
    const validatedPdas = allProposals.slice(0, 10).map(p => p.publicKey);
    const rejectedPdas = allProposals.slice(10).map(p => p.publicKey);
    console.log(`      ${validatedPdas.length} propositions identifiées comme Validated.`);
    console.log(`      ${rejectedPdas.length} propositions identifiées comme Rejected.`);

    // --- 5. Exécution des mises à jour (On-chain) ---
    console.log("   5. Exécution des mises à jour de statut et marquage époque...");
    // Mettre à jour les Validated
    for (const pda of validatedPdas) {
        await program.methods.updateProposalStatus({ validated: {} })
            .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: epochPda, proposal: pda })
            .signers([adminAuthority])
            .rpc();
    }
    // Mettre à jour les Rejected
    for (const pda of rejectedPdas) {
         await program.methods.updateProposalStatus({ rejected: {} })
            .accounts({ authority: adminAuthority.publicKey, programConfig: programConfigPda, epochManagement: epochPda, proposal: pda })
            .signers([adminAuthority])
            .rpc();
    }
    console.log("      Statuts des propositions mis à jour.");

    // Marquer l'époque comme traitée
    await program.methods.markEpochProcessed()
        .accounts({ 
            authority: adminAuthority.publicKey, 
            programConfig: programConfigPda, 
            epochManagement: epochPda 
        })
        .signers([adminAuthority])
        .rpc();
    console.log(`      Époque ${testEpochId} marquée comme traitée.`);

    // --- 6. Vérification Finale ---
    console.log("   6. Vérification de l'état final...");
    // Vérifier le flag processed de l'époque
    const finalEpoch = await program.account.epochManagement.fetch(epochPda);
    expect(finalEpoch.processed).to.be.true;

    // Vérifier les statuts des propositions
    for (const pda of validatedPdas) {
        const proposal = await program.account.tokenProposal.fetch(pda);
        expect(proposal.status).to.deep.equal({ validated: {} });
    }
     for (const pda of rejectedPdas) {
        const proposal = await program.account.tokenProposal.fetch(pda);
        expect(proposal.status).to.deep.equal({ rejected: {} });
    }
    console.log("      État final des propositions et de l'époque vérifié.");
    console.log(`--- Test Complet Simulation Crank pour Epoch ${testEpochId} Terminé ---`);
  });

}); 