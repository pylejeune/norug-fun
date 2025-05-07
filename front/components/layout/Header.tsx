"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/public/images/noruglogo.png";
import telegramLogo from "@/public/images/telegramLogo.svg";
import xLogo from "@/public/images/xLogo.svg";
import { useWallet } from "@solana/wallet-adapter-react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import LocaleSwitcher from "../ui/LocaleSwitcher";

// Import the client component with dynamic import
const ClientWalletMultiButton = dynamic(
  () => import("../wallet/ClientWalletMultiButton"),
  {
    ssr: false,
    loading: () => (
      <div className="w-[180px] h-[48px] bg-gray-800 rounded-md animate-pulse" />
    ),
  }
);

const SOCIAL_LINKS = {
  telegram: "https://t.me/norugdotfun",
  twitter: "https://x.com/norugdotfun",
};

export default function Header() {
  const { connected } = useWallet();
  const isMobile = useIsMobile();

  return (
    <header className="w-full">
      <div className="mx-3 my-1 md:mx-6 md:my-3">
        <div className="flex h-12 md:h-14 items-center justify-between gap-2 rounded-xl  px-3 md:px-4 backdrop-blur-sm">
          {isMobile && (
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center">
                <Image
                  src={logo}
                  alt="NoRug.fun Logo"
                  width={32}
                  height={32}
                  className="w-8 h-8"
                />
              </Link>
              {/* Logos sociaux */}
              <div className="flex items-center gap-3">
                <Link
                  href={SOCIAL_LINKS.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  <Image
                    src={telegramLogo}
                    alt="Telegram"
                    width={20}
                    height={20}
                    className="w-3 h-3"
                  />
                </Link>
                <Link
                  href={SOCIAL_LINKS.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="transition-opacity hover:opacity-80"
                >
                  <Image
                    src={xLogo}
                    alt="X (Twitter)"
                    width={20}
                    height={20}
                    className="w-3 h-3"
                  />
                </Link>
              </div>
            </div>
          )}
          <div className="flex items-center gap-2 ml-auto">
            <LocaleSwitcher />
            <div>
              <ClientWalletMultiButton />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
