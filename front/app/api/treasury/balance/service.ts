import { Connection, PublicKey } from "@solana/web3.js";
import {
  getProgram,
  getAdminKeypair,
  createAnchorWallet,
  RPC_ENDPOINT,
  idl as SHARED_IDL,
  connectionConfig,
} from "@/lib/utils";

export async function fetchTreasuryBalance() {
  const connection = new Connection(RPC_ENDPOINT, connectionConfig);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, SHARED_IDL, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  // Vérifier si la treasury est initialisée
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  // Récupérer le compte treasury
  const treasuryAccount = await (program.account as any).treasury.fetchNullable(
    treasuryPDA
  );

  if (!treasuryAccount) {
    throw new Error("La treasury n'est pas initialisée.");
  }

  // Récupérer le solde direct du compte PDA sur la blockchain et convertir en SOL
  const treasuryPdaBalanceSOL =
    (await connection.getBalance(treasuryPDA)) / 1_000_000_000;

  // Accéder aux balances de sous-comptes avec la même notation que dans les tests et convertir en SOL
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

  // Log des balances en SOL dans le format des tests
  console.log("\nVérification Soldes (Treasury) en SOL:");
  console.log("-------------------------------------------------------");
  console.log(`- Statut: Treasury existante et accessible`);
  console.log(`- Solde PDA Trésorerie: ${treasuryPdaBalanceSOL} SOL`);
  console.log(`  Distribution Trésorerie:`);
  console.log(`  - Marketing: ${marketingBalanceSOL} SOL`);
  console.log(`  - Team: ${teamBalanceSOL} SOL`);
  console.log(`  - Operations: ${operationsBalanceSOL} SOL`);
  console.log(`  - Investments: ${investmentsBalanceSOL} SOL`);
  console.log(`  - Crank: ${crankBalanceSOL} SOL`);
  console.log(`  - Total sous-comptes: ${totalSubAccountsSOL} SOL`);

  return {
    // Message sur le statut
    message: "Treasury existante et accessible",
    // Soldes en SOL
    treasuryPdaBalance: treasuryPdaBalanceSOL,
    subAccounts: {
      marketing: marketingBalanceSOL,
      team: teamBalanceSOL,
      operations: operationsBalanceSOL,
      investments: investmentsBalanceSOL,
      crank: crankBalanceSOL,
      total: totalSubAccountsSOL,
    },
    // Informations sur le compte
    address: treasuryPDA.toString(),
    authority: treasuryAccount.authority.toString(),
    RPC_ENDPOINT: RPC_ENDPOINT,
  };
}
