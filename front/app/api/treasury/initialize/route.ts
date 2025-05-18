import { Connection, PublicKey } from "@solana/web3.js";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";

import {
  createAnchorWallet,
  createErrorResponse,
  createSuccessResponse,
  getAdminKeypair,
  getProgram,
  RPC_ENDPOINT,
  verifyAuthToken,
} from "@/lib/utils";
import { initializeTreasury } from "./service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(
    `[${requestId}] 🚀 Vérification de l'initialisation de la treasury...`
  );

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
    const result = await initializeTreasury();
    console.log(`[${requestId}] ✅ Opération terminée: ${result.message}`);

    // Si la treasury est initialisée, récupérons les données exactement comme dans balance/route.ts
    if (result.treasury) {
      const connection = new Connection(RPC_ENDPOINT);
      const adminKeypair = getAdminKeypair();
      const wallet = createAnchorWallet(adminKeypair);
      const program = getProgram(connection, wallet);

      if (!program) {
        throw new Error("Programme non initialisé");
      }

      // Récupérer l'adresse de la trésorerie
      const [treasuryPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("treasury")],
        program.programId
      );

      // Récupérer le compte treasury directement
      const treasuryAccount = await (
        program.account as any
      ).treasury.fetchNullable(treasuryPDA);

      if (!treasuryAccount) {
        throw new Error("La treasury n'est pas correctement initialisée.");
      }

      // Récupérer le solde direct du compte PDA et convertir en SOL
      const treasuryPdaBalanceSOL =
        (await connection.getBalance(treasuryPDA)) / 1_000_000_000;

      // Accéder aux balances de sous-comptes comme dans balance/route.ts
      const marketingBalanceSOL =
        (treasuryAccount.marketing.solBalance
          ? treasuryAccount.marketing.solBalance.toNumber()
          : treasuryAccount.marketing.sol_balance) / 1_000_000_000;

      const teamBalanceSOL =
        (treasuryAccount.team.solBalance
          ? treasuryAccount.team.solBalance.toNumber()
          : treasuryAccount.team.sol_balance) / 1_000_000_000;

      const operationsBalanceSOL =
        (treasuryAccount.operations.solBalance
          ? treasuryAccount.operations.solBalance.toNumber()
          : treasuryAccount.operations.sol_balance) / 1_000_000_000;

      const investmentsBalanceSOL =
        (treasuryAccount.investments.solBalance
          ? treasuryAccount.investments.solBalance.toNumber()
          : treasuryAccount.investments.sol_balance) / 1_000_000_000;

      const crankBalanceSOL =
        (treasuryAccount.crank.solBalance
          ? treasuryAccount.crank.solBalance.toNumber()
          : treasuryAccount.crank.sol_balance) / 1_000_000_000;

      // Calculer le total des sous-comptes en SOL
      const totalSubAccountsSOL =
        marketingBalanceSOL +
        teamBalanceSOL +
        operationsBalanceSOL +
        investmentsBalanceSOL +
        crankBalanceSOL;

      // Logger les résultats comme dans balance/route.ts et ajouter le message sur le statut
      console.log("\nVérification Soldes (Treasury) en SOL:");
      console.log("-------------------------------------------------------");
      console.log(`- Statut: ${result.message}`);
      console.log(`- Solde PDA Trésorerie: ${treasuryPdaBalanceSOL} SOL`);
      console.log(`  Distribution Trésorerie:`);
      console.log(`  - Marketing: ${marketingBalanceSOL} SOL`);
      console.log(`  - Team: ${teamBalanceSOL} SOL`);
      console.log(`  - Operations: ${operationsBalanceSOL} SOL`);
      console.log(`  - Investments: ${investmentsBalanceSOL} SOL`);
      console.log(`  - Crank: ${crankBalanceSOL} SOL`);
      console.log(`  - Total sous-comptes: ${totalSubAccountsSOL} SOL`);

      // Formater la réponse exactement comme dans balance/route.ts et ajouter le message
      const formattedResponse = {
        message: result.message,
        treasuryPdaBalance: treasuryPdaBalanceSOL,
        subAccounts: {
          marketing: marketingBalanceSOL,
          team: teamBalanceSOL,
          operations: operationsBalanceSOL,
          investments: investmentsBalanceSOL,
          crank: crankBalanceSOL,
          total: totalSubAccountsSOL,
        },
        address: treasuryPDA.toString(),
        authority: treasuryAccount.authority.toString(),
        RPC_ENDPOINT: RPC_ENDPOINT,
      };

      return createSuccessResponse(requestId, formattedResponse);
    }

    // Si la treasury n'a pas été initialisée avec succès, retourner le résultat tel quel
    return createSuccessResponse(requestId, result);
  } catch (error) {
    return createErrorResponse(requestId, error);
  }
}
