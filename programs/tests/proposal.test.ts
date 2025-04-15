import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Programs } from "../target/types/programs";
import { PublicKey } from "@solana/web3.js";
import { expect } from "chai";
import { generateRandomId, setupTestEnvironment } from "./utils.test";


describe("Tests des propositions de tokens", () => {
  const { provider, program } = setupTestEnvironment();
  let proposalPda: PublicKey;
  let epochPda: PublicKey;

  // Constantes pour les tests
  const tokenName = "noRugToken";
  const tokenSymbol = "NRT";
  const totalSupply = new anchor.BN(1000000);
  const creatorAllocation = 10;
  const lockupPeriod = new anchor.BN(86400); // 1 jour en secondes

  it("Démarre une nouvelle époque", async () => {
    const epochId = generateRandomId();
    const startTime = new anchor.BN(Math.floor(Date.now() / 1000));
    const endTime = new anchor.BN(startTime.toNumber() + 86400); // 1 jour

    [epochPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("epoch"), epochId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const tx = await program.methods
      .startEpoch(epochId, startTime, endTime)
      .accounts({
        authority: provider.wallet.publicKey,
        epochManagement: epochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);
    console.log("\nCreation nouvelle epoch:");
    console.log("----------------------------------\n");

    // Vérifier que l'époque a été créée correctement
    const epoch = await program.account.epochManagement.fetch(epochPda);
    console.log("Valeurs attendues pour l'époque:");
    console.log(`- epochId: ${epochId.toString()}`);
    console.log(`- startTime: ${startTime.toString()}`);
    console.log(`- endTime: ${endTime.toString()}`);
    console.log(`- status: { active: {} }`);
    
    console.log("Valeurs réelles de l'époque:");
    console.log(`- epochId: ${epoch.epochId.toString()}`);
    console.log(`- startTime: ${epoch.startTime.toString()}`);
    console.log(`- endTime: ${epoch.endTime.toString()}`);
    console.log(`- status: ${JSON.stringify(epoch.status)}`);
    
    expect(epoch.epochId.toString()).to.equal(epochId.toString());
    expect(epoch.startTime.toString()).to.equal(startTime.toString());
    expect(epoch.endTime.toString()).to.equal(endTime.toString());
    expect(epoch.status).to.deep.equal({ active: {} });
  });

  it("Crée une nouvelle proposition de token", async () => {
    // Récupérer l'époque pour obtenir l'epoch_id correct
    const epoch = await program.account.epochManagement.fetch(epochPda);
    const epochId = epoch.epochId;
    
    [proposalPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("proposal"),
        provider.wallet.publicKey.toBuffer(),
        epochId.toArrayLike(Buffer, "le", 8),
        Buffer.from(tokenName),
      ],
      program.programId
    );

    console.log("\nTest de création de proposition:");
    console.log("----------------------------------\n");
    console.log(`- epochId utilisé: ${epochId.toString()}`);
    console.log(`- tokenName: ${tokenName}`);

    const tx = await program.methods
      .createProposal(
        tokenName,
        tokenSymbol,
        totalSupply,
        creatorAllocation,
        lockupPeriod
      )
      .accounts({
        creator: provider.wallet.publicKey,
        tokenProposal: proposalPda,
        epoch: epochPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("Transaction signature", tx);

    // Vérifier que la proposition a été créée correctement
    const proposal = await program.account.tokenProposal.fetch(proposalPda);
    console.log("Valeurs attendues pour la proposition:");
    console.log(`- tokenName: ${tokenName}`);
    console.log(`- tokenSymbol: ${tokenSymbol}`);
    console.log(`- totalSupply: ${totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${creatorAllocation}`);
    console.log(`- supporterAllocation: ${100 - creatorAllocation}`);
    console.log(`- solRaised: 0`);
    console.log(`- totalContributions: 0`);
    console.log(`- lockupPeriod: ${lockupPeriod.toString()}`);
    
    console.log("Valeurs réelles de la proposition:");
    console.log(`- tokenName: ${proposal.tokenName}`);
    console.log(`- tokenSymbol: ${proposal.tokenSymbol}`);
    console.log(`- totalSupply: ${proposal.totalSupply.toString()}`);
    console.log(`- creatorAllocation: ${proposal.creatorAllocation}`);
    console.log(`- supporterAllocation: ${proposal.supporterAllocation}`);
    console.log(`- solRaised: ${proposal.solRaised.toString()}`);
    console.log(`- totalContributions: ${proposal.totalContributions.toString()}`);
    console.log(`- lockupPeriod: ${proposal.lockupPeriod.toString()}`);
    
    expect(proposal.tokenName).to.equal(tokenName);
    expect(proposal.tokenSymbol).to.equal(tokenSymbol);
    expect(proposal.totalSupply.toString()).to.equal(totalSupply.toString());
    expect(proposal.creatorAllocation).to.equal(creatorAllocation);
    expect(proposal.supporterAllocation).to.equal(100 - creatorAllocation);
    expect(proposal.solRaised.toString()).to.equal("0");
    expect(proposal.totalContributions.toString()).to.equal("0");
    expect(proposal.lockupPeriod.toString()).to.equal(lockupPeriod.toString());
  });

  it("Affiche la liste des propositions de tokens", async () => {
    const allProposals = await program.account.tokenProposal.all();
    
    console.log("\nListe des propositions de tokens:");
    console.log("-------------------------------");
    
    if (allProposals.length === 0) {
      console.log("Aucune proposition trouvée");
    } else {
      allProposals.forEach((proposal, index) => {
        const account = proposal.account;
        console.log(`\nProposition #${index + 1}:`);
        console.log(`- Token Name: ${account.tokenName}`);
        console.log(`- Token Symbol: ${account.tokenSymbol}`);
        console.log(`- Total Supply: ${account.totalSupply.toString()}`);
        console.log(`- Creator Allocation: ${account.creatorAllocation}%`);
        console.log(`- Supporter Allocation: ${account.supporterAllocation}%`);
        console.log(`- SOL Raised: ${account.solRaised.toString()}`);
        console.log(`- Total Contributions: ${account.totalContributions.toString()}`);
        console.log(`- Lockup Period: ${account.lockupPeriod.toString()} secondes`);
      });
    }
    
    expect(allProposals.length).to.be.greaterThan(0);
  });
}); 