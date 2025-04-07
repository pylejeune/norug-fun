"use client";

import logo from "@/public/images/logo.svg";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";
import Link from "next/link";
import LocaleSwitcher from "./LocaleSwitcher";

export default function Header() {
  const { connected } = useWallet();

  return (
    <header className="sticky top-2 z-30 mt-2 w-full md:mt-5">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative flex h-14 items-center justify-between rounded-2xl bg-gray-900/90 px-3 backdrop-blur-sm">
          {/* Logo */}
          <Link
            href={`/`}
            className="inline-flex items-center gap-2 shrink-0"
            aria-label="NoRug"
          >
            <Image src={logo} alt="NoRug.fun Logo" width={32} height={32} />
            <p className="text-xl font-bold text-white">NoRug.fun</p>
          </Link>

          {/* Right Section: Language + Wallet */}
          <div className="flex items-center gap-2">
            <LocaleSwitcher />
            <div>
              <WalletMultiButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
