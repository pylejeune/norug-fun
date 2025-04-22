"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import logo from "@/public/images/noruglogo.png";
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

export default function Header() {
  const { connected } = useWallet();
  const isMobile = useIsMobile();

  return (
    <header className="w-full">
      <div className="mx-3 my-2 md:mx-6 md:my-4">
        <div className="flex h-12 md:h-14 items-center justify-between gap-2 rounded-xl  px-3 md:px-4 backdrop-blur-sm">
          {isMobile && (
            <Link href="/" className="flex items-center">
              <Image
                src={logo}
                alt="NoRug.fun Logo"
                width={32}
                height={32}
                className="w-8 h-8"
              />
            </Link>
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
