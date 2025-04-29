import { PublicKey } from "@solana/web3.js";
import * as dotenv from "dotenv";
import { join } from "path";

// Charger les variables d'environnement depuis le fichier .env
dotenv.config({ path: join(__dirname, ".env") });

export const CONFIG = {
    RPC_ENDPOINT: process.env.RPC_ENDPOINT || "http://localhost:8899",
    ADMIN_KEYPAIR_PATH: process.env.ADMIN_KEYPAIR_PATH || "target/deploy/programs-keypair.json",
    SCHEDULER_INTERVAL: 60000, // 1 minute en millisecondes
    PROGRAM_ID: new PublicKey("3HBzNutk8DrRfffCS74S55adJAjgY8NHrWXgRtABaSbF"),
}; 