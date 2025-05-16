import * as anchor from "@coral-xyz/anchor";
import { getProgram, getAdminKeypair, createAnchorWallet, RPC_ENDPOINT } from "../../shared/utils";
import { PublicKey, Connection } from "@solana/web3.js";

interface TreasurySubAccount {
  sol_balance: number;
  last_withdrawal: number;
}

interface TreasuryAccount {
  authority: PublicKey;
  sol_balance: number;
  marketing: TreasurySubAccount;
  team: TreasurySubAccount;
  operations: TreasurySubAccount;
  investments: TreasurySubAccount;
  crank: TreasurySubAccount;
}

interface TreasuryInitializeResult {
  success: boolean;
  message: string;
  treasury?: {
    address: string;
    authority: string;
    balance: number;
    accounts: {
      marketing: { balance: number; lastWithdrawal: string, publicKey: string };
      team: { balance: number; lastWithdrawal: string, publicKey: string };
      operations: { balance: number; lastWithdrawal: string, publicKey: string };
      investments: { balance: number; lastWithdrawal: string, publicKey: string };
      crank: { balance: number; lastWithdrawal: string, publicKey: string };
    };
  };
}

/**
 * Vérifie si la treasury est déjà initialisée et l'initialise si nécessaire
 * @returns Résultat de l'opération avec statut et message
 */
export async function initializeTreasury(): Promise<TreasuryInitializeResult> {
  const connection = new Connection(RPC_ENDPOINT);
  const adminKeypair = getAdminKeypair();
  const wallet = createAnchorWallet(adminKeypair);
  const program = getProgram(connection, wallet);

  if (!program) {
    throw new Error("Programme non initialisé");
  }

  // Vérifier si la treasury est déjà initialisée
  const [treasuryPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from("treasury")],
    program.programId
  );

  try {
    // Essayer de récupérer le compte treasury
    // Vérification si le compte treasury existe sur l'objet program.account
    let treasuryAccount = null;
    
    try {
      if (program.account && typeof program.account === 'object') {
        // Liste des noms de comptes disponibles pour le débogage
        console.log("Comptes disponibles:", Object.keys(program.account));
        
        // Vérifier si treasury existe
        if ((program.account as any).treasury) {
          treasuryAccount = await (program.account as any).treasury.fetchNullable(treasuryPDA);
          console.log("Treasury trouvée:", treasuryAccount ? "Oui" : "Non");
        } else {
          console.log("Le compte treasury n'existe pas dans program.account");
        }
      }
    } catch (fetchError) {
      console.error("Erreur lors de la récupération du compte treasury:", fetchError);
    }
    
    // Vérifier si le compte existe indépendamment de l'IDL
    const accountInfo = await connection.getAccountInfo(treasuryPDA);
    console.log("Compte Treasury sur la blockchain:", accountInfo ? "Existe" : "N'existe pas");
    
    if (treasuryAccount) {
      // Formater les données du compte treasury pour l'affichage
      const treasuryData = treasuryAccount as TreasuryAccount;
      
      return { 
        success: true, 
        message: "La treasury est déjà initialisée.",
        treasury: {
          address: treasuryPDA.toString(),
          authority: treasuryData.authority.toString(),
          balance: treasuryData.sol_balance / 1_000_000_000,
          accounts: {
            marketing: {
              balance: treasuryData.marketing.sol_balance / 1_000_000_000, // Convertir en SOL
              lastWithdrawal: new Date(treasuryData.marketing.last_withdrawal * 1000).toString(),
              publicKey: treasuryPDA.toString()
            },
            team: {
              balance: treasuryData.team.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.team.last_withdrawal * 1000).toString(),
              publicKey: treasuryPDA.toString()
            },
            operations: {
              balance: treasuryData.operations.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.operations.last_withdrawal * 1000).toString(),
              publicKey: treasuryPDA.toString()
            },
            investments: {
              balance: treasuryData.investments.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.investments.last_withdrawal * 1000).toString(),
              publicKey: treasuryPDA.toString()
            },
            crank: {
              balance: treasuryData.crank.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.crank.last_withdrawal * 1000).toString(),
              publicKey: treasuryPDA.toString()
            }
          }
        }
      };
    }

    // Si on arrive ici, la treasury n'existe pas et doit être initialisée
    const tx = program.methods.initializeTreasury(adminKeypair.publicKey)
      .accounts({
        treasury: treasuryPDA,
        authority: adminKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([adminKeypair]);
    
    await tx.rpc();

    // Récupérer les informations après initialisation
    let newTreasuryAccount = null;
    try {
      if ((program.account as any).treasury) {
        newTreasuryAccount = await (program.account as any).treasury.fetch(treasuryPDA);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du compte treasury après initialisation:", error);
    }

    if (newTreasuryAccount) {
      const treasuryData = newTreasuryAccount as TreasuryAccount;
      
      return { 
        success: true, 
        message: "Treasury initialisée avec succès.",
        treasury: {
          address: treasuryPDA.toString(),
          authority: treasuryData.authority.toString(),
          accounts: {
            marketing: {
              balance: treasuryData.marketing.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.marketing.last_withdrawal * 1000).toISOString()
            },
            team: {
              balance: treasuryData.team.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.team.last_withdrawal * 1000).toISOString()
            },
            operations: {
              balance: treasuryData.operations.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.operations.last_withdrawal * 1000).toISOString()
            },
            investments: {
              balance: treasuryData.investments.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.investments.last_withdrawal * 1000).toISOString()
            },
            crank: {
              balance: treasuryData.crank.sol_balance / 1_000_000_000,
              lastWithdrawal: new Date(treasuryData.crank.last_withdrawal * 1000).toISOString()
            }
          }
        }
      };
    } else {
      return { 
        success: true, 
        message: "Treasury initialisée avec succès, mais les détails ne sont pas disponibles."
      };
    }
  } catch (error: unknown) {
    console.error("Erreur lors de la vérification/initialisation de la treasury:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { 
      success: false, 
      message: `Erreur lors de l'opération: ${errorMessage}` 
    };
  }
} 