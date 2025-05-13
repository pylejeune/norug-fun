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
// import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets";

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
    <ConnectionProvider endpoint={network}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
