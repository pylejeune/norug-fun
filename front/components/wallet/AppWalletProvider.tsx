"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  BitgetWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  MathWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import React, { useMemo } from "react";
import { WalletModalProvider } from "./CustomWalletModalProvider";
import { Commitment } from "@solana/web3.js";
// import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets";

// Récupérer l'environnement depuis les variables d'environnement
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

// Définir l'endpoint en fonction de l'environnement
const endpoint =
  SOLANA_NETWORK === "localhost"
    ? "http://127.0.0.1:8888"
    : "https://api.devnet.solana.com";

// Configuration de la connexion
const config = {
  commitment: "confirmed" as Commitment,
  wsEndpoint: undefined,
  disableRetryOnRateLimit: true,
};

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log("🌐 Utilisation du réseau:", SOLANA_NETWORK);
  const network = endpoint;

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new BitgetWalletAdapter(),
      new LedgerWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TorusWalletAdapter(),
      new MathWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={network} config={config}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
