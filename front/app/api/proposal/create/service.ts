import {
  RPC_ENDPOINT,
  createAnchorWallet,
  getAdminKeypair,
  getProgram,
  idl as SHARED_IDL
} from "@/lib/utils";
import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Connection } from "@solana/web3.js";

export interface ProposalCreateParams {
  tokenName: string;
  tokenSymbol: string;
  description: string;
  totalSupply: number;
  creatorAllocation: number;
  lockupPeriod: number;
  imageUrl: string | null;
  epochId: string | null;
}

export async function createProposal(params: ProposalCreateParams) {
  console.log(
    "🔍 Initialisation de la création de proposition avec params:",
    params
  );

  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, SHARED_IDL, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  console.log(
    "✅ Programme initialisé, autorité:",
    adminKeypair.publicKey.toString()
  );

  // Récupérer l'ID d'époque actif si aucun n'est fourni
  let epochId = params.epochId;
  let epochPDA: PublicKey;
  let epochAccount: any;

  try {
    // Récupérer toutes les époques disponibles
    const allEpochs = await (program.account as any).epochManagement.all();
    console.log("✅ Nombre d'époques trouvées:", allEpochs.length);

    if (allEpochs.length === 0) {
      throw new Error("Aucune époque trouvée dans le programme");
    }

    // Si epochId est spécifié, chercher cette époque spécifique
    if (epochId) {
      console.log("🔍 Recherche de l'époque spécifique:", epochId);
      const specificEpoch = allEpochs.find(
        (epoch: any) => epoch.account.epochId.toString() === epochId
      );

      if (!specificEpoch) {
        throw new Error(`L'époque avec l'ID ${epochId} n'existe pas`);
      }

      epochPDA = specificEpoch.publicKey;
      epochAccount = specificEpoch.account;
    } else {
      // Sinon, prendre la première époque active ou la plus récente
      console.log("🔍 Recherche d'une époque active par défaut...");

      // D'abord, essayer de trouver une époque active
      const activeEpoch = allEpochs.find(
        (epoch: any) => epoch.account.status.active !== undefined
      );

      if (activeEpoch) {
        epochPDA = activeEpoch.publicKey;
        epochAccount = activeEpoch.account;
        epochId = epochAccount.epochId.toString();
        console.log("✅ Époque active trouvée:", epochId);
      } else {
        // Sinon, prendre la dernière époque créée
        console.log("⚠️ Aucune époque active, sélection de la dernière époque");
        // Trier par ID d'époque (supposant que des IDs plus élevés sont plus récents)
        allEpochs.sort((a: any, b: any) =>
          b.account.epochId.cmp(a.account.epochId)
        );

        epochPDA = allEpochs[0].publicKey;
        epochAccount = allEpochs[0].account;
        epochId = epochAccount.epochId.toString();
        console.log("✅ Dernière époque sélectionnée:", epochId);
      }
    }

    console.log("✅ Époque sélectionnée:", {
      id: epochId,
      pubkey: epochPDA.toString(),
      status: Object.keys(epochAccount.status)[0],
    });
  } catch (error) {
    console.error("❌ Erreur lors de la récupération des époques:", error);
    throw new Error(
      `Impossible de trouver une époque valide: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  // Vérifier que le trésor est initialisé
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  // Calculer la PDA pour la proposition
  const [proposalPDA] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("proposal"),
      adminKeypair.publicKey.toBuffer(),
      new anchor.BN(epochAccount.epochId).toArrayLike(Buffer, "le", 8),
      Buffer.from(params.tokenName),
    ],
    program.programId
  );

  console.log("🔑 PDA de la proposition calculée:", proposalPDA.toString());

  // Appel à l'instruction de création de proposition
  const tx = await (program as any).methods
    .createProposal(
      params.tokenName,
      params.tokenSymbol,
      params.description,
      params.imageUrl,
      new anchor.BN(params.totalSupply),
      params.creatorAllocation,
      new anchor.BN(params.lockupPeriod)
    )
    .accounts({
      creator: adminKeypair.publicKey,
      tokenProposal: proposalPDA,
      epoch: epochPDA,
      treasury: treasuryPDA,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();

  console.log("✅ Transaction envoyée:", tx);

  // Récupérer les détails de la proposition créée
  const proposalAccount = await (program.account as any).tokenProposal.fetch(
    proposalPDA
  );

  return {
    transactionId: tx,
    proposalAddress: proposalPDA.toString(),
    proposalDetails: {
      tokenName: proposalAccount.tokenName,
      tokenSymbol: proposalAccount.tokenSymbol,
      description: proposalAccount.description,
      creator: proposalAccount.creator.toString(),
      epochId: proposalAccount.epochId.toString(),
      totalSupply: proposalAccount.totalSupply.toString(),
      creatorAllocation: proposalAccount.creatorAllocation,
      supporterAllocation: proposalAccount.supporterAllocation,
      status: Object.keys(proposalAccount.status)[0],
      creationTimestamp: proposalAccount.creationTimestamp.toString(),
      lockupPeriod: proposalAccount.lockupPeriod.toString(),
      imageUrl: proposalAccount.imageUrl || null
    }
  };
}
