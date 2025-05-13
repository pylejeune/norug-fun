"use client";

import logo from "@/public/images/noruglogo.png";
import { WalletName } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { ChevronDown, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useWalletModal } from "./CustomWalletModalProvider";

export const WalletModal = () => {
  const { wallets, select } = useWallet();
  const { visible, setVisible } = useWalletModal();
  const [fadeIn, setFadeIn] = useState(false);
  const [showAllWallets, setShowAllWallets] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("WalletModal");

  const phantomWallet = wallets.find((w) => w.adapter.name === "Phantom");
  const otherWallets = wallets.filter((w) => w.adapter.name !== "Phantom");

  useEffect(() => {
    if (visible) {
      setFadeIn(true);
      setShowAllWallets(false);
    } else {
      setFadeIn(false);
    }
  }, [visible]);

  if (!visible) return null;

  const handleClose = () => {
    setFadeIn(false);
    setTimeout(() => setVisible(false), 150);
  };

  const handleWalletClick = (walletName: WalletName) => {
    select(walletName);
    handleClose();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-150 ${
        fadeIn ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        ref={ref}
        className={`w-full max-w-md transform rounded-xl border border-[#4a5334] bg-[#1f2714] p-6 shadow-xl transition-all duration-150 ${
          fadeIn ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between border-b border-[#4a5334] pb-4">
          <div className="flex items-center gap-3">
            <Image
              src={logo}
              alt="NoRug.fun Logo"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <h2 className="text-xl font-semibold text-[#e6d3ba]">
              {t("title")}
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-[#e6d3ba]/70 hover:text-[#e6d3ba] transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {/* Phantom Wallet Button */}
          {phantomWallet && (
            <button
              onClick={() => handleWalletClick(phantomWallet.adapter.name)}
              className="flex w-full items-center gap-3 rounded-lg bg-[#2d3720] p-3 
                       hover:bg-[#3d4829] transition-colors border border-[#4a5334]/50
                       hover:border-[#4a5334] group"
            >
              <div
                className="relative h-6 w-6 rounded-full bg-[#1f2714] p-1
                          group-hover:bg-[#2d3720] transition-colors"
              >
                <Image
                  src={phantomWallet.adapter.icon}
                  alt="Phantom Wallet"
                  width={24}
                  height={24}
                  className="h-full w-full"
                />
              </div>
              <span className="flex-1 text-left font-medium text-[#e6d3ba]">
                Phantom
              </span>
            </button>
          )}

          {/* More Wallets Button */}
          <div className="relative">
            <button
              onClick={() => setShowAllWallets(!showAllWallets)}
              className="flex w-full items-center gap-3 rounded-lg bg-[#2d3720] p-3 
                       hover:bg-[#3d4829] transition-colors border border-[#4a5334]/50
                       hover:border-[#4a5334] group"
            >
              <div
                className="relative h-6 w-6 rounded-full bg-[#1f2714] p-1
                          group-hover:bg-[#2d3720] transition-colors flex items-center justify-center"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className="text-[#e6d3ba]"
                >
                  <path
                    d="M21 18V19C21 20.1 20.1 21 19 21H5C3.89 21 3 20.1 3 19V5C3 3.9 3.89 3 5 3H19C20.1 3 21 3.9 21 5V6H12C10.89 6 10 6.9 10 8V16C10 17.1 10.89 18 12 18H21ZM12 16H22V8H12V16ZM16 13.5C15.17 13.5 14.5 12.83 14.5 12C14.5 11.17 15.17 10.5 16 10.5C16.83 10.5 17.5 11.17 17.5 12C17.5 12.83 16.83 13.5 16 13.5Z"
                    fill="currentColor"
                  />
                </svg>
              </div>
              <span className="flex-1 text-left font-medium text-[#e6d3ba]">
                {t("moreWallets")}
              </span>
              <ChevronDown
                size={20}
                className={`text-[#e6d3ba] transition-transform ${
                  showAllWallets ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown for other wallets */}
            {showAllWallets && (
              <div className="absolute left-0 right-0 mt-1 rounded-lg border border-[#4a5334] bg-[#2d3720] overflow-hidden">
                {otherWallets.map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletClick(wallet.adapter.name)}
                    className="flex w-full items-center gap-3 p-3 hover:bg-[#3d4829] transition-colors"
                  >
                    <div className="relative h-6 w-6 rounded-full bg-[#1f2714] p-1">
                      <Image
                        src={wallet.adapter.icon}
                        alt={wallet.adapter.name}
                        width={24}
                        height={24}
                        className="h-full w-full"
                      />
                    </div>
                    <span className="flex-1 text-left font-medium text-[#e6d3ba]">
                      {wallet.adapter.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-[#e6d3ba]/70">
          {t("connectMessage")}
        </p>
      </div>
    </div>
  );
};
