import { NextResponse } from 'next/server';
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { Programs } from "../../../../programs/target/types/programs";
import { BN } from "@coral-xyz/anchor";

// Configuration
const RPC_ENDPOINT = process.env.RPC_ENDPOINT || "http://localhost:8899";
const PROGRAM_ID = new PublicKey("3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF");
const ADMIN_SEED = Uint8Array.from([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32]);

// Configuration des headers pour CORS et cache
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Headers pour CORS
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Fonction pour générer le keypair admin de manière déterministe
function getAdminKeypair(): Keypair {
    return Keypair.fromSeed(ADMIN_SEED);
}

// Gestion des requêtes OPTIONS pour CORS
export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
    console.log("🚀 Démarrage de la vérification des époques...");
    console.log("📡 Configuration RPC:", RPC_ENDPOINT);
    
    try {
        // Initialiser la connexion
        console.log("🔌 Initialisation de la connexion Solana...");
        const connection = new anchor.web3.Connection(RPC_ENDPOINT);
        const adminKeypair = getAdminKeypair();
        console.log("👤 Admin public key:", adminKeypair.publicKey.toString());
        
        // Vérifier le solde
        console.log("💰 Vérification du solde...");
        const balance = await connection.getBalance(adminKeypair.publicKey);
        console.log(`💎 Solde actuel: ${balance / LAMPORTS_PER_SOL} SOL`);
        
        if (balance < 0.01 * LAMPORTS_PER_SOL) {
            console.error("❌ Solde insuffisant pour les transactions");
            return NextResponse.json({ 
                success: false, 
                error: "Solde insuffisant pour les transactions",
                balance: balance / LAMPORTS_PER_SOL
            }, { 
                status: 400,
                headers: corsHeaders
            });
        }

        // Initialiser le provider et le programme
        console.log("🔧 Initialisation du provider et du programme...");
        const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(adminKeypair), {});
        anchor.setProvider(provider);
        const program = anchor.workspace.Programs as Program<Programs>;
        console.log("✅ Programme initialisé avec succès");

        // Dériver la PDA pour le compte de configuration
        console.log("🔑 Dérivation de la PDA de configuration...");
        const [configPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from("config")],
            program.programId
        );
        console.log("📍 PDA de configuration:", configPDA.toString());

        // Récupérer toutes les époques
        console.log("📊 Récupération des époques...");
        const allEpochs = await program.account.epochManagement.all();
        console.log(`📈 Nombre total d'époques: ${allEpochs.length}`);
        
        const activeEpochs = allEpochs.filter(epoch => 
            JSON.stringify(epoch.account.status) === JSON.stringify({ active: {} })
        );
        console.log(`🎯 Nombre d'époques actives: ${activeEpochs.length}`);

        const results = [];

        // Pour chaque époque active
        for (const epoch of activeEpochs) {
            const currentTime = Math.floor(Date.now() / 1000);
            const endTimeUnix = epoch.account.endTime.toNumber();
            
            console.log(`\n📅 Vérification de l'époque ${epoch.account.epochId.toString()}:`);
            console.log(`⏰ Heure actuelle: ${new Date(currentTime * 1000).toISOString()}`);
            console.log(`⌛ Heure de fin: ${new Date(endTimeUnix * 1000).toISOString()}`);
            
            if (currentTime >= endTimeUnix) {
                console.log(`🔔 L'époque ${epoch.account.epochId.toString()} doit être fermée`);
                try {
                    const epochId = epoch.account.epochId;
                    const [epochPDA] = await PublicKey.findProgramAddressSync(
                        [
                            Buffer.from("epoch"),
                            new BN(epochId).toArrayLike(Buffer, "le", 8)
                        ],
                        program.programId
                    );
                    console.log("📍 PDA de l'époque:", epochPDA.toString());

                    const accounts = {
                        epochManagement: epochPDA,
                        authority: adminKeypair.publicKey,
                        program_config: configPDA,
                        system_program: SystemProgram.programId,
                    };

                    console.log("📝 Préparation de la transaction...");
                    await program.methods
                        .endEpoch(new BN(epoch.account.epochId))
                        .accounts(accounts)
                        .signers([adminKeypair])
                        .rpc();
                    
                    console.log("✅ Transaction réussie");
                    results.push({
                        epochId: epoch.account.epochId.toString(),
                        status: "closed",
                        success: true,
                        timestamp: new Date().toISOString()
                    });
                } catch (error) {
                    console.error(`❌ Erreur lors de la fermeture de l'époque:`, error);
                    results.push({
                        epochId: epoch.account.epochId.toString(),
                        status: "error",
                        error: error.message,
                        timestamp: new Date().toISOString()
                    });
                }
            } else {
                console.log(`⏳ L'époque ${epoch.account.epochId.toString()} est toujours active`);
            }
        }

        console.log("\n📊 Résumé de l'exécution:");
        console.log(JSON.stringify(results, null, 2));

        return NextResponse.json({ 
            success: true, 
            results,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            rpcEndpoint: RPC_ENDPOINT
        }, { 
            headers: corsHeaders
        });

    } catch (error) {
        console.error("❌ Erreur globale:", error);
        return NextResponse.json({ 
            success: false, 
            error: error.message,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            rpcEndpoint: RPC_ENDPOINT
        }, { 
            status: 500,
            headers: corsHeaders
        });
    }
} 