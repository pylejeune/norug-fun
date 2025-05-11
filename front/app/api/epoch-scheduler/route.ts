import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, Transaction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// Chargement de l'Anchor IDL (Interface Description Language)
// Note: l'IDL sera chargé automatiquement par anchor.workspace, pas besoin de le charger manuellement
// Nous gardons le fichier IDL pour référence, mais il ne sera pas utilisé directement

// Configuration sécurisée via variables d'environnement
const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF");
const ADMIN_SEED_BASE64 = process.env.ADMIN_SEED_BASE64; // Utiliser la variable d'environnement

// const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);
// const ADMIN_SEED_BASE64_LOCAL_TEST = Buffer.from(ADMIN_SEED).toString('base64');

// Fonction pour générer le keypair admin à partir de la seed stockée en Base64
function getAdminKeypair(): Keypair {
  console.log("ADMIN_SEED_BASE64 (valeur reçue):", process.env.ADMIN_SEED_BASE64); // Log pour débogage
  if (!ADMIN_SEED_BASE64) {
    throw new Error("ADMIN_SEED_BASE64 n'est pas défini dans les variables d'environnement ou est vide");
  }
  
  try {
    const seedBuffer = Buffer.from(ADMIN_SEED_BASE64, 'base64');
    // La seed ADMIN_SEED_BASE64 (AQID...) correspond à une seed de 32 bytes.
    // Pour une seed de 32 bytes, il faut utiliser Keypair.fromSeed().
    if (seedBuffer.length === 32) {
        console.log("Utilisation de Keypair.fromSeed() car seedBuffer fait 32 bytes.");
        return Keypair.fromSeed(seedBuffer);
    } else if (seedBuffer.length === 64) {
        console.log("Utilisation de Keypair.fromSecretKey() car seedBuffer fait 64 bytes.");
        return Keypair.fromSecretKey(seedBuffer);
    } else {
        console.error(`Taille de seedBuffer inattendue: ${seedBuffer.length} bytes. Devrait être 32 ou 64.`);
        throw new Error(`Taille de seedBuffer après décodage Base64 inattendue: ${seedBuffer.length}`);
    }
  } catch (error: any) {
    console.error("Erreur lors de la génération du keypair admin (détail):", error.message);
    throw new Error(`Impossible de générer le keypair admin: ${error.message}`);
  }
}

// Durée maximale d'exécution pour éviter les timeout sur Vercel
// Vercel limite les fonctions serverless à 10s en hobby/pro, et 60s en équipe/entreprise
const MAX_EXECUTION_TIME = 50000; // 50 secondes en ms

interface SchedulerResults {
  success: boolean;
  message: string;
  details: {
    epochsChecked: number;
    epochsClosed: number;
    errors: string[];
  };
}

// Fonction pour vérifier et terminer les époques
async function checkAndEndEpochs(): Promise<SchedulerResults> {
  const results: SchedulerResults = {
    success: false,
    message: "",
    details: {
      epochsChecked: 0,
      epochsClosed: 0,
      errors: []
    }
  };

  try {
    // Initialiser la connexion
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    
    // Créer un objet wallet compatible avec AnchorProvider, comme dans le crank
    const wallet = {
      publicKey: adminKeypair.publicKey,
      signTransaction: async (tx: Transaction): Promise<Transaction> => {
        tx.partialSign(adminKeypair);
        return tx;
      },
      signAllTransactions: async (txs: Transaction[]): Promise<Transaction[]> => {
        return txs.map(tx => {
          tx.partialSign(adminKeypair);
          return tx;
        });
      },
    };
    
    const provider = new anchor.AnchorProvider(
      connection, 
      wallet as any, // Cast en 'any' pour satisfaire le typage strict d'AnchorProvider
      anchor.AnchorProvider.defaultOptions()
    );
    anchor.setProvider(provider);
    
    // Charger l'IDL directement depuis la réponse de l'API getAccountInfo
    console.log("📝 Chargement de l'IDL...");
    let programIdl;
    try {
      programIdl = await anchor.Program.fetchIdl(PROGRAM_ID, provider);
      if (!programIdl) {
        throw new Error("Impossible de charger l'IDL du programme");
      }
    } catch (error: any) {
      console.error("Erreur lors du chargement de l'IDL:", error);
      results.message = `Erreur lors du chargement de l'IDL: ${error.message}`;
      results.details.errors.push(results.message);
      return results;
    }
    
    console.log("✅ IDL chargé avec succès");
    
    // Créer le programme avec l'IDL récupéré
    // @ts-ignore - La propriété existe dans l'IDL même si TypeScript ne la reconnaît pas
    const program = new anchor.Program(programIdl, PROGRAM_ID, provider);
    console.log("✅ Programme initialisé avec l'ID:", PROGRAM_ID.toString());

    // Dériver la PDA pour le compte de configuration
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    console.log("🔑 PDA de configuration:", configPDA.toString());
    
    // Tenter de récupérer le compte ProgramConfig pour vérifier l'autorité admin
    try {
      // @ts-ignore - La propriété existe dans l'IDL même si TypeScript ne la reconnaît pas
      const config = await program.account.programConfig.fetch(configPDA);
      console.log("👤 Admin authority configurée:", config.adminAuthority.toString());
      console.log("👤 Admin keypair utilisé:", adminKeypair.publicKey.toString());
      
      // Vérifier si l'admin keypair correspond à l'admin authority
      if (adminKeypair.publicKey.toString() !== config.adminAuthority.toString()) {
        results.message = "Le keypair admin ne correspond pas à l'admin authority configurée";
        results.details.errors.push(results.message);
        return results;
      }
      console.log("✅ Admin authority vérifiée avec succès");
    } catch (error: any) {
      results.message = "Erreur lors de la récupération du compte ProgramConfig";
      results.details.errors.push(results.message);
      if (error?.message) {
        results.details.errors.push(error.message);
      }
      return results;
    }

    // Récupérer toutes les époques
    console.log("📊 Récupération des époques...");
    // @ts-ignore - La propriété existe dans l'IDL même si TypeScript ne la reconnaît pas
    const allEpochs = await program.account.epochManagement.all();
    console.log(`📈 Nombre total d'époques: ${allEpochs.length}`);
    
    // Filtrer les époques actives
    const activeEpochs = allEpochs.filter((epoch: any) => 
      JSON.stringify(epoch.account.status) === JSON.stringify({ active: {} })
    );
    console.log(`🎯 Nombre d'époques actives: ${activeEpochs.length}`);

    results.details.epochsChecked = activeEpochs.length;
    
    // Pour chaque époque active
    for (const epoch of activeEpochs) {
      const endTimeUnix = epoch.account.endTime.toNumber();
      const currentTime = Math.floor(Date.now() / 1000);
      
      console.log(`\n📅 Vérification de l'époque ${epoch.account.epochId.toString()}:`);
      console.log(`⏰ Heure actuelle: ${new Date(currentTime * 1000).toISOString()}`);
      console.log(`⌛ Heure de fin: ${new Date(endTimeUnix * 1000).toISOString()}`);
      
      // Vérifier si l'époque doit être terminée
      if (currentTime >= endTimeUnix) {
        console.log(`🔔 L'époque ${epoch.account.epochId.toString()} doit être fermée`);
        try {
          // Dériver la PDA pour l'époque
          const epochId = epoch.account.epochId;
          const [epochPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("epoch"),
              new BN(epochId).toArrayLike(Buffer, "le", 8)
            ],
            program.programId
          );
          console.log("📍 PDA de l'époque:", epochPDA.toString());
          
          // Préparer les comptes pour la transaction
          const accounts = {
            epochManagement: epochPDA,
            authority: adminKeypair.publicKey,
            program_config: configPDA,
            system_program: SystemProgram.programId,
          };
          
          console.log("📝 Préparation de la transaction...");
          // Appeler l'instruction end_epoch
          await program.methods
            .endEpoch(new BN(epoch.account.epochId))
            .accounts(accounts)
            .signers([adminKeypair])
            .rpc();
          
          console.log("✅ Transaction réussie");
          results.details.epochsClosed++;
        } catch (error: any) {
          console.error(`❌ Erreur lors de la fermeture de l'époque:`, error);
          results.details.errors.push(`Erreur lors de la fermeture de l'époque ${epoch.account.epochId.toString()}: ${error?.message || JSON.stringify(error)}`);
        }
      } else {
        console.log(`⏳ L'époque ${epoch.account.epochId.toString()} est toujours active`);
      }
    }

    results.success = true;
    results.message = `Vérification terminée: ${results.details.epochsChecked} époque(s) vérifiée(s), ${results.details.epochsClosed} époque(s) fermée(s)`;
    console.log("\n📊 Résumé:", results.message);
    
  } catch (error: any) {
    results.success = false;
    results.message = `Erreur dans le scheduler: ${error?.message || JSON.stringify(error)}`;
    results.details.errors.push(results.message);
    console.error("❌ Erreur globale:", error);
  }

  return results;
}

// Handler pour les requêtes GET
export async function GET(request: Request) {
  console.log("🚀 Démarrage de la vérification des époques...");
  console.log("📡 Configuration RPC:", RPC_ENDPOINT);
  
  // Vérifier si la requête contient un header d'autorisation
  const authHeader = request.headers.get("authorization");
  
  // Vérifier l'autorisation
  // Ce code vérifie un token simple, mais vous pourriez mettre en place 
  // un système d'autorisation plus robuste pour la production
  if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    console.error("❌ Erreur d'authentification: Token invalide ou manquant");
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Définir un timeout pour éviter que l'API ne s'exécute trop longtemps
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error("L'opération a dépassé le temps maximum autorisé"));
    }, MAX_EXECUTION_TIME);
  });
  
  try {
    // Exécuter la logique avec un timeout
    const results = await Promise.race([
      checkAndEndEpochs(),
      timeoutPromise
    ]);
    
    return new Response(JSON.stringify({
      ...results,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      rpcEndpoint: RPC_ENDPOINT
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error("❌ Erreur lors de l'exécution du scheduler:", error);
    
    return new Response(JSON.stringify({
      success: false,
      message: error?.message || "Une erreur s'est produite",
      details: { errors: [error?.toString()] },
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      rpcEndpoint: RPC_ENDPOINT
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 