import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
// Importer l'IDL localement
import idlContentFromFile from "./idl/programs.json";

// Configuration sécurisée via variables d'environnement
const RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.devnet.solana.com";

// Validation explicite de PROGRAM_ID
let PROGRAM_ID;
try {
  const programIdString = process.env.PROGRAM_ID || "3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF";
  console.log("🔑 Utilisation de PROGRAM_ID:", programIdString);
  PROGRAM_ID = new PublicKey(programIdString);
  console.log("✅ PROGRAM_ID validé comme PublicKey:", PROGRAM_ID.toString());
} catch (error) {
  console.error("❌ Erreur lors de la création de PublicKey:", error.message);
  throw new Error(`PROGRAM_ID invalide: ${error.message}`);
}

const ADMIN_SEED_BASE64 = process.env.ADMIN_SEED_BASE64; // Utiliser la variable d'environnement

console.log("Aperçu de l'IDL utilisé :", JSON.stringify(idlContentFromFile).slice(0, 500));

// Fonction pour générer le keypair admin à partir de la seed stockée en Base64
function getAdminKeypair() {
  if (!ADMIN_SEED_BASE64) {
    throw new Error("ADMIN_SEED_BASE64 n'est pas défini dans les variables d'environnement ou est vide");
  }
  
  try {
    const seedBuffer = Buffer.from(ADMIN_SEED_BASE64, 'base64');
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
  } catch (error) {
    console.error("Erreur lors de la génération du keypair admin (détail):", error.message);
    throw new Error(`Impossible de générer le keypair admin: ${error.message}`);
  }
}

// Durée maximale d'exécution pour éviter les timeout sur Vercel
const MAX_EXECUTION_TIME = 50000; // 50 secondes en ms

// Fonction pour nettoyer l'IDL et le rendre compatible avec Anchor
function sanitizeIdl(idl) {
  // Créer une copie profonde de l'IDL pour éviter de modifier l'original
  const cleanIdl = JSON.parse(JSON.stringify(idl));
  
  // Supprimer les champs problématiques connus pour causer des erreurs
  if (cleanIdl.metadata) {
    delete cleanIdl.metadata.address;
  }

  // Supprimer les discriminators des instructions qui peuvent causer des problèmes
  if (cleanIdl.instructions && Array.isArray(cleanIdl.instructions)) {
    cleanIdl.instructions.forEach(instruction => {
      if (instruction.discriminator) {
        delete instruction.discriminator;
      }
      
      // Vérifier et nettoyer les comptes qui pourraient contenir des adresses
      if (instruction.accounts && Array.isArray(instruction.accounts)) {
        instruction.accounts.forEach(account => {
          // Supprimer tout champ qui pourrait contenir une adresse non valide
          if (account.pda && typeof account.pda === 'object') {
            delete account.pda;
          }
        });
      }
    });
  }
  
  // Nettoyer les comptes qui pourraient contenir des adresses
  if (cleanIdl.accounts && Array.isArray(cleanIdl.accounts)) {
    cleanIdl.accounts.forEach(account => {
      if (account.pda && typeof account.pda === 'object') {
        delete account.pda;
      }
    });
  }
  
  // S'assurer que les champs essentiels existent
  cleanIdl.version = cleanIdl.version || "0.1.0";
  cleanIdl.name = cleanIdl.name || "programs";
  cleanIdl.instructions = cleanIdl.instructions || [];
  cleanIdl.accounts = cleanIdl.accounts || [];
  cleanIdl.types = cleanIdl.types || [];
  
  return cleanIdl;
}

// Créer une classe Programme personnalisée qui ne dépend pas directement d'anchor.Program
class CustomProgram {
  constructor(programId, provider) {
    this.programId = programId;
    this.provider = provider;
    
    // Exposer les fonctions de compte nécessaires
    this.account = {
      programConfig: {
        fetch: async (address) => {
          try {
            return await this._fetchAccount(address, 'ProgramConfig');
          } catch (error) {
            console.error("Erreur lors de la récupération du compte ProgramConfig:", error);
            throw error;
          }
        }
      },
      epochManagement: {
        all: async () => {
          try {
            return await this._fetchAllEpochs();
          } catch (error) {
            console.error("Erreur lors de la récupération des époques:", error);
            throw error;
          }
        }
      }
    };
    
    // Exposer les méthodes du programme
    this.methods = {
      endEpoch: (epochId) => {
        return {
          accounts: (accounts) => {
            return {
              signers: (signers) => {
                return {
                  rpc: async () => {
                    try {
                      return await this._endEpoch(epochId, accounts, signers);
                    } catch (error) {
                      console.error("Erreur lors de l'exécution de endEpoch:", error);
                      throw error;
                    }
                  }
                };
              }
            };
          }
        };
      }
    };
  }
  
  // Méthode privée pour récupérer un compte
  async _fetchAccount(address, accountType) {
    console.log(`📤 Récupération du compte ${accountType} à l'adresse ${address}`);
    try {
      // Récupérer les données du compte réel
      const accountInfo = await this.provider.connection.getAccountInfo(address);
      if (!accountInfo) {
        throw new Error(`Compte ${accountType} non trouvé à l'adresse ${address}`);
      }
      
      console.log(`✅ Compte ${accountType} récupéré, ${accountInfo.data.length} octets`);
      
      if (accountType === 'ProgramConfig') {
        // Note: Dans une implémentation complète, nous décoderions correctement les données Borsh
        // Pour simplifier, nous supposons que le format du compte ProgramConfig a:
        // - Un discriminator Anchor de 8 bytes
        // - L'admin authority (PublicKey) commence à l'offset 8
        
        // Discriminator (8 bytes) + admin (32 bytes) + ...
        const data = accountInfo.data;
        
        // Extraire la publicKey de l'admin authority (à l'offset 8, longueur 32 bytes)
        // Cela suppose que le premier champ après le discriminator est adminAuthority
        const adminAuthorityBytes = data.slice(8, 8 + 32);
        const adminAuthority = new PublicKey(adminAuthorityBytes);
        
        console.log(`👤 Admin authority extraite: ${adminAuthority.toString()}`);
        
        return {
          adminAuthority: adminAuthority,
          // Autres champs selon votre structure...
        };
      }
      
      throw new Error(`Type de compte non pris en charge: ${accountType}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération du compte ${accountType}:`, error);
      throw error;
    }
  }
  
  // Méthode privée pour récupérer toutes les époques
  async _fetchAllEpochs() {
    console.log("📤 Récupération de toutes les époques...");
    try {
      // En réalité, nous devrions utiliser getProgramAccounts avec des filtres
      const programAccounts = await this.provider.connection.getProgramAccounts(this.programId, {
        filters: [
          // Filtre pour le discriminator d'EpochManagement
          // Dans une implémentation complète, nous connaîtrions le discriminator exact
          // Pour cet exemple, on utilise un filtre générique qui récupère tous les comptes
        ],
      });
      
      console.log(`🔍 Nombre total de comptes trouvés: ${programAccounts.length}`);
      
      // Filtrer pour ne garder que les comptes EpochManagement
      // Dans une implémentation complète, nous vérifierions le discriminator de chaque compte
      const epochAccounts = programAccounts.filter(account => {
        // Ce code assume que les comptes ont un format spécifique
        // Dans un système réel, vous vérifieriez le discriminator Anchor (les 8 premiers bytes)
        return account.account.data.length > 8;
      });
      
      // Transformer les données en objets EpochManagement
      return epochAccounts.map((account, index) => {
        try {
          // Note: Dans une implémentation complète, nous décoderions correctement les données Borsh
          const data = account.account.data;
          
          // Supposons un format simple pour EpochManagement:
          // - Un discriminator Anchor de 8 bytes
          // - epochId (u64) à l'offset 8
          // - status à l'offset 16 (structure enum avec tag d'1 byte)
          // - endTime (i64) à un offset ultérieur, approximativement 17+
          
          // Extrayons l'epochId (u64, 8 bytes)
          const epochIdBytes = data.slice(8, 16);
          const epochId = new BN(epochIdBytes, 'le');
          
          // L'état pourrait être à l'offset 16, assumons qu'il y a un tag (1 byte)
          // 0 = inactive, 1 = active, etc. selon votre enum
          const statusTag = data[16];
          const status = statusTag === 1 ? { active: {} } : { inactive: {} };
          
          // Supposons que endTime est à l'offset 17 (ceci est une simplification)
          const endTimeBytes = data.slice(17, 25); // 8 bytes pour i64
          const endTime = new BN(endTimeBytes, 'le');
          
          console.log(`📊 Époque ${index+1}: ID=${epochId.toString()}, Status=${JSON.stringify(status)}, EndTime=${endTime.toString()}`);
          
          return {
            publicKey: account.pubkey,
            account: {
              epochId: epochId,
              status: status,
              endTime: endTime,
              // Autres champs selon votre structure...
            }
          };
        } catch (error) {
          console.error(`⚠️ Erreur lors du décodage du compte ${account.pubkey.toString()}`, error);
          // Retournons un objet avec des valeurs par défaut
          return {
            publicKey: account.pubkey,
            account: {
              epochId: new BN(0),
              status: { inactive: {} },
              endTime: new BN(0),
            }
          };
        }
      });
    } catch (error) {
      console.error("❌ Erreur lors de la récupération des époques:", error);
      // Si nous ne pouvons pas récupérer les époques, retournons une liste vide
      return [];
    }
  }
  
  // Méthode privée pour exécuter l'instruction endEpoch
  async _endEpoch(epochId, accounts, signers) {
    console.log(`📤 Exécution de l'instruction endEpoch pour l'époque ${epochId}`);
    try {
      // Construire l'instruction
      const ix = this._createEndEpochInstruction(epochId, accounts);
      
      // Créer une transaction
      const tx = new Transaction();
      
      // Ajouter l'instruction récente à la transaction
      tx.add(ix);
      
      // Obtenir le dernier blockhash pour la transaction
      const { blockhash } = await this.provider.connection.getLatestBlockhash();
      tx.recentBlockhash = blockhash;
      tx.feePayer = this.provider.wallet.publicKey;
      
      // Signer la transaction avec tous les signataires requis
      for (const signer of signers) {
        tx.partialSign(signer);
      }
      
      console.log("🔏 Transaction signée, envoi en cours...");
      
      // Envoyer la transaction signée
      const signature = await this.provider.connection.sendRawTransaction(tx.serialize());
      
      // Confirmer la transaction
      const confirmation = await this.provider.connection.confirmTransaction(signature);
      
      if (confirmation.value.err) {
        throw new Error(`Erreur lors de la confirmation: ${JSON.stringify(confirmation.value.err)}`);
      }
      
      console.log(`✅ Transaction endEpoch réussie: ${signature}`);
      return signature;
    } catch (error) {
      console.error("❌ Erreur lors de l'exécution de endEpoch:", error);
      throw error;
    }
  }
  
  // Méthode privée pour créer l'instruction endEpoch
  _createEndEpochInstruction(epochId, accounts) {
    console.log(`⚙️ Création de l'instruction pour endEpoch(${epochId})`);
    console.log("   Comptes:", Object.keys(accounts).join(", "));
    
    // Pour end_epoch, le format de données pourrait être:
    // 1. Un discriminator ou index d'instruction (généralement 1 byte)
    // 2. Les arguments de la fonction (ici juste epochId, un u64 de 8 bytes)
    
    // Créons le buffer de données:
    // - En se basant sur lib.rs, endEpoch est la 6ème instruction (index 5)
    // - Suivi par l'epochId encodé comme u64 little-endian
    const instructionIndex = 5; // Basé sur la position dans le module
    
    // Créer un buffer pour l'index d'instruction (1 byte) + epochId (8 bytes)
    const data = Buffer.alloc(1 + 8);
    
    // Écrire l'index d'instruction
    data.writeUInt8(instructionIndex, 0);
    
    // Écrire l'epochId comme u64 little-endian
    if (typeof epochId === 'number') {
      // Si c'est un nombre, le convertir en BN
      epochId = new BN(epochId);
    }
    
    // Vérifier si c'est un BN et l'écrire dans le buffer
    if (BN.isBN(epochId)) {
      const epochIdBytes = epochId.toArrayLike(Buffer, 'le', 8);
      epochIdBytes.copy(data, 1);
    } else {
      console.error("⚠️ Format d'epochId invalide:", epochId);
      throw new Error("Format d'epochId invalide");
    }
    
    // Créer l'instruction avec les comptes et les données
    return new TransactionInstruction({
      keys: [
        { pubkey: accounts.epochManagement, isSigner: false, isWritable: true },
        { pubkey: accounts.authority, isSigner: true, isWritable: false },
        { pubkey: accounts.program_config, isSigner: false, isWritable: false },
        { pubkey: accounts.system_program, isSigner: false, isWritable: false },
      ],
      programId: this.programId,
      data: data,
    });
  }
}

// Interface pour les résultats du scheduler
const createSchedulerResults = () => ({
  success: false,
  message: "",
  details: {
    epochsChecked: 0,
    epochsClosed: 0,
    errors: []
  }
});

// Fonction pour vérifier et terminer les époques
async function checkAndEndEpochs() {
  const results = createSchedulerResults();

  try {
    // Initialiser la connexion
    const connection = new Connection(RPC_ENDPOINT);
    const adminKeypair = getAdminKeypair();
    
    // Créer un objet wallet compatible avec AnchorProvider
    const wallet = {
      publicKey: adminKeypair.publicKey,
      signTransaction: async (tx) => {
        tx.partialSign(adminKeypair);
        return tx;
      },
      signAllTransactions: async (txs) => {
        return txs.map(tx => {
          tx.partialSign(adminKeypair);
          return tx;
        });
      },
    };
    
    const provider = new anchor.AnchorProvider(
      connection, 
      wallet, 
      anchor.AnchorProvider.defaultOptions()
    );
    anchor.setProvider(provider);
    
    // Afficher la clé publique du wallet du provider
    if (provider.wallet && provider.wallet.publicKey) {
      console.log("🔑 Wallet PublicKey du Provider (adminKeypair):");
      console.log("   ", provider.wallet.publicKey.toString());
    } else {
      console.warn("⚠️ Wallet du Provider ou sa PublicKey est indéfini(e).");
    }
    console.log("🅿️ PROGRAM_ID cible:");
    console.log("   ", PROGRAM_ID.toString());

    // Traitement de l'IDL pour le rendre compatible
    console.log("🧹 Nettoyage de l'IDL pour assurer la compatibilité...");
    const cleanIdl = sanitizeIdl(idlContentFromFile);
    console.log("✅ IDL nettoyé avec succès");
    
    // Vérifier l'IDL nettoyé
    if (!cleanIdl) {
        console.error("Erreur: L'IDL nettoyé est vide");
        results.message = "Erreur critique: L'IDL nettoyé est vide";
        results.details.errors.push(results.message);
        return results; 
    }
    
    let program;
    try {
      console.log("📝 Création d'une implémentation personnalisée du programme");
      console.log("   - PROGRAM_ID:", PROGRAM_ID.toString());
      
      // Utiliser notre implémentation personnalisée au lieu d'anchor.Program
      program = new CustomProgram(PROGRAM_ID, provider);
      console.log("✅ Programme personnalisé initialisé avec succès");
      
      console.log("🔍 Vérification de program.programId:", program.programId.toString());
    } catch (error) {
      console.error("❌ Erreur critique lors de l'initialisation du programme personnalisé:", error);
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      if (error.cause) console.error("   Cause:", error.cause);
      
      results.message = `Erreur critique lors de l'initialisation du programme: ${error.message}`;
      results.details.errors.push(results.message);
      return results;
    }

    // Dériver la PDA pour le compte de configuration
    const [configPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );
    console.log("🔑 PDA de configuration:", configPDA.toString());
    
    // Tenter de récupérer le compte ProgramConfig pour vérifier l'autorité admin
    try {
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
    } catch (error) {
      results.message = "Erreur lors de la récupération du compte ProgramConfig";
      results.details.errors.push(results.message);
      if (error?.message) {
        results.details.errors.push(error.message);
      }
      return results;
    }

    // Récupérer toutes les époques
    console.log("📊 Récupération des époques...");
    const allEpochs = await program.account.epochManagement.all();
    console.log(`📈 Nombre total d'époques: ${allEpochs.length}`);
    
    // Filtrer les époques actives
    const activeEpochs = allEpochs.filter((epoch) => 
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
        } catch (error) {
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
    
  } catch (error) {
    results.success = false;
    results.message = `Erreur dans le scheduler: ${error?.message || JSON.stringify(error)}`;
    results.details.errors.push(results.message);
    console.error("❌ Erreur globale:", error);
  }

  return results;
}

// Handler pour les requêtes GET
export async function GET(request) {
  console.log("🚀 Démarrage de la vérification des époques...");
  console.log("📡 Configuration RPC:", RPC_ENDPOINT);
  
  // Vérifier si la requête contient un header d'autorisation
  const authHeader = request.headers.get("authorization");
  
  // Vérifier l'autorisation
  if (!authHeader || authHeader !== `Bearer ${process.env.API_SECRET_KEY}`) {
    console.error("❌ Erreur d'authentification: Token invalide ou manquant");
    return new Response(JSON.stringify({ error: "Non autorisé" }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  // Définir un timeout pour éviter que l'API ne s'exécute trop longtemps
  const timeoutPromise = new Promise((_, reject) => {
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
  } catch (error) {
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