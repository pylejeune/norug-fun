import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';

// Récupérer l'environnement depuis les variables d'environnement
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";
const DEPLOYER_WALLET = process.env.DEPLOYER_WALLET_PUBKEY;

// Définir l'endpoint en fonction de l'environnement
const endpoint =
  SOLANA_NETWORK === "localhost"
    ? "http://127.0.0.1:8899"
    : clusterApiUrl("devnet");

// Utiliser process.cwd() pour obtenir le répertoire de travail actuel
const logFilePath = path.join(process.cwd(), 'logs.txt');

console.log(logFilePath);

// Vérifier si le fichier de log existe, sinon le créer
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, ''); // Crée un fichier vide
}

// Sauvegarder l'ancienne fonction console.log
const originalConsoleLog = console.log;

// Redéfinir console.log
console.log = (...args: any[]) => {
  const timestamp = new Date().toISOString();
  const message = args.join(' '); // Joindre les arguments en une seule chaîne
  fs.appendFileSync(logFilePath, `[${timestamp}] ${message}\n`); // Écrire dans le fichier
  //originalConsoleLog(...args); // Appeler l'ancienne fonction console.log pour afficher dans la console
};

export async function GET(request: Request) {
  try {
    // Vérifier que la clé publique du déployer est configurée
    if (!DEPLOYER_WALLET) {
      const errorMessage = 'La clé publique du wallet deployer n\'est pas configurée dans les variables d\'environnement';
      console.log(errorMessage); // Utiliser le nouveau console.log
      return new Response(
        JSON.stringify({ 
          success: false,
          error: errorMessage,
          network: SOLANA_NETWORK
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Créer une connexion à Solana
    const connection = new Connection(endpoint, 'confirmed');
    
    // Créer un objet PublicKey à partir de la chaîne
    const pubKey = new PublicKey(DEPLOYER_WALLET);
    
    // Récupérer la balance du wallet
    const balance = await connection.getBalance(pubKey);
    
    // Convertir de lamports à SOL (1 SOL = 1,000,000,000 lamports)
    const balanceInSOL = balance / 1_000_000_000;

    console.log('Balance récupérée avec succès:', balanceInSOL); // Utiliser le nouveau console.log

    return new Response(
      JSON.stringify({ 
        success: true,
        pubkey: DEPLOYER_WALLET,
        balance: balance,
        balanceInSOL: balanceInSOL,
        network: SOLANA_NETWORK
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    const errorMessage = `Erreur lors de la récupération de la balance: ${error.message}`;
    console.log(errorMessage); // Utiliser le nouveau console.log
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage,
        network: SOLANA_NETWORK
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 