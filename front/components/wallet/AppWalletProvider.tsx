"use client";

import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import React, { useMemo } from "react";
// import { UnsafeBurnerWalletAdapter } from "@solana/wallet-adapter-wallets";

import "@solana/wallet-adapter-react-ui/styles.css";

// Endpoints configuration
const LOCALHOST_ENDPOINT = "http://127.0.0.1:8899";
// const DEVNET_ENDPOINT = "https://api.devnet.solana.com";

export default function AppWalletProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Pour le développement local
  const endpoint = useMemo(() => LOCALHOST_ENDPOINT, []);

  // Pour devnet
  // const endpoint = useMemo(() => DEVNET_ENDPOINT, []);

  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
