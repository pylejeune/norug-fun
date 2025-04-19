"use client";

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import dynamic from "next/dynamic";

// Disable SSR for WalletMultiButton
const DynamicWalletMultiButton = dynamic(
  () => Promise.resolve(WalletMultiButton),
  {
    ssr: false,
  }
);

export default function ClientWalletMultiButton() {
  return <DynamicWalletMultiButton />;
}
