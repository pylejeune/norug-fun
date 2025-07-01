"use client";

import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { Check, ChevronDown, Copy, LogOut, User } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useWalletModal } from "./CustomWalletModalProvider";

export default function ClientWalletMultiButton() {
  const { publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [isOpen, setIsOpen] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { locale } = useParams();
  const t = useTranslations("WalletButton");

  const handleCopyAddress = async () => {
    if (!publicKey) return;
    try {
      await navigator.clipboard.writeText(publicKey.toBase58());
      setIsCopied(true);
      toast.success(t("addressCopied"));
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error(t("copyFailed"));
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!publicKey) {
    return (
      <Button
        onClick={() => setVisible(true)}
        className="px-4 py-2 bg-[#213a0e] hover:bg-[#2d4f14] text-[#e6d3ba] rounded-lg transition-colors font-medium"
      >
        {t("connect")}
      </Button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-[#213a0e] hover:bg-[#2d4f14] text-[#e6d3ba] rounded-lg transition-colors font-medium flex items-center gap-2"
      >
        <span className="font-mono">
          {publicKey.toBase58().slice(0, 4)}...{publicKey.toBase58().slice(-4)}
        </span>
        <ChevronDown
          size={16}
          className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
        />
      </Button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-lg bg-[#1f2714] border border-[#4a5334] shadow-xl z-[100]">
          <div className="p-1">
            <Button
              variant="ghost"
              onClick={handleCopyAddress}
              className="flex items-center gap-2 w-full p-2 text-[#e6d3ba] hover:bg-[#2d3720] rounded-lg transition-colors justify-start h-auto"
            >
              {isCopied ? <Check size={16} /> : <Copy size={16} />}
              <span>{t("copyAddress")}</span>
            </Button>
            <Button
              variant="ghost"
              asChild
              className="flex items-center gap-2 w-full p-2 text-[#e6d3ba] hover:bg-[#2d3720] rounded-lg transition-colors justify-start h-auto"
            >
              <Link
                href={`/${locale}/profile/${publicKey.toBase58()}`}
                onClick={() => setIsOpen(false)}
              >
                <User size={16} />
                <span>{t("viewProfile")}</span>
              </Link>
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                disconnect();
                setIsOpen(false);
              }}
              className="flex items-center gap-2 w-full p-2 text-red-400 hover:bg-[#2d3720] rounded-lg transition-colors justify-start h-auto"
            >
              <LogOut size={16} />
              <span>{t("disconnect")}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
