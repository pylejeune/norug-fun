// front/app/api/proposal/list/route.ts
import {
  createAnchorWallet,
  createErrorResponse,
  createSuccessResponse,
  getAdminKeypair,
  getProgram,
  RPC_ENDPOINT,
  verifyAuthToken,
} from "@/lib/utils";
import { Connection } from "@solana/web3.js";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Récupération de la liste des propositions...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(
      requestId,
      {
        message: "Non autorisé",
        name: "AuthenticationError",
      },
      401
    );
  }

  try {
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    const wallet = createAnchorWallet(adminKeypair);
    const program = getProgram(connection, wallet);

    if (!program) {
      throw new Error("Programme non initialisé");
    }

    // Récupérer toutes les propositions
    const proposals = await (program.account as any).tokenProposal.all();
    console.log(
      `[${requestId}] ✅ Nombre de propositions trouvées: ${proposals.length}`
    );

    // Formater la réponse
    const formattedProposals = proposals.map((proposal: any) => ({
      publicKey: proposal.publicKey.toString(),
      tokenName: proposal.account.tokenName,
      tokenSymbol: proposal.account.tokenSymbol,
      creator: proposal.account.creator.toString(),
      epochId: proposal.account.epochId.toString(),
      totalSupply: proposal.account.totalSupply.toString(),
      creatorAllocation: proposal.account.creatorAllocation,
      status: Object.keys(proposal.account.status)[0],
      creationTimestamp: proposal.account.creationTimestamp.toString(),
    }));

    return createSuccessResponse(requestId, {
      proposals: formattedProposals,
    });
  } catch (error) {
    console.error(
      `[${requestId}] ❌ Erreur lors de la récupération des propositions:`,
      error
    );
    return createErrorResponse(requestId, error);
  }
}
