"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import React, { useMemo } from "react";
// import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";
import { clusterApiUrl } from "@solana/web3.js";

// Récupérer l'environnement depuis les variables d'environnement
const SOLANA_NETWORK = process.env.NEXT_PUBLIC_SOLANA_NETWORK || "devnet";

// Définir l'endpoint en fonction de l'environnement
const endpoint =
  SOLANA_NETWORK === "localhost"
    ? "http://127.0.0.1:8899"
    : clusterApiUrl("devnet");
export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  console.log(SOLANA_NETWORK);
  const network = endpoint;

  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
