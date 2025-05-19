// front/app/api/proposal/list/route.ts
import { NextRequest } from "next/server";
import { randomUUID } from 'crypto';
import { Connection } from "@solana/web3.js";
import {
    verifyAuthToken,
    createSuccessResponse,
    createErrorResponse,
    getProgram,
    getAdminKeypair,
    createAnchorWallet,
    RPC_ENDPOINT,
    SHARED_IDL
} from "../../../../lib/utils";
import { ipfsToHttp, getAccessibleImageUrl } from "../create/image-service";


export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Récupération de la liste des propositions...`);

  // Vérification du token d'authentification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentification échouée`);
    return createErrorResponse(requestId, {
      message: "Non autorisé",
      name: "AuthenticationError"
    }, 401);
  }

  try {
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    const wallet = createAnchorWallet(adminKeypair);
    const program = getProgram(connection, SHARED_IDL, wallet);

    if (!program) {
      throw new Error("Programme non initialisé");
    }

    // Récupérer toutes les propositions
    const proposals = await (program.account as any).tokenProposal.all();
    console.log(`[${requestId}] ✅ Nombre de propositions trouvées: ${proposals.length}`);

    // Formater la réponse
    const formattedProposals = proposals.map((proposal: any) => {
      // Récupérer et convertir l'URL d'image IPFS en URL HTTP
      const ipfsImageUrl = proposal.account.imageUrl || '';
      const httpImageUrl = getAccessibleImageUrl(ipfsImageUrl);
      
      return {
        publicKey: proposal.publicKey.toString(),
        tokenName: proposal.account.tokenName,
        tokenSymbol: proposal.account.tokenSymbol,
        description: proposal.account.description || '',
        creator: proposal.account.creator.toString(),
        epochId: proposal.account.epochId.toString(),
        totalSupply: proposal.account.totalSupply.toString(),
        creatorAllocation: proposal.account.creatorAllocation,
        status: Object.keys(proposal.account.status)[0],
        creationTimestamp: proposal.account.creationTimestamp.toString(),
        imageUrl: ipfsImageUrl,
        imageHttpUrl: httpImageUrl
      };
    });

    return createSuccessResponse(requestId, {
      proposals: formattedProposals,
      total: formattedProposals.length
    });
  } catch (error) {
    console.error(`[${requestId}] ❌ Erreur lors de la récupération des propositions:`, error);
    return createErrorResponse(requestId, error);
  }
}