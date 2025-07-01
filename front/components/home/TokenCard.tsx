"use client";

import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Droplet, TrendingDown, TrendingUp, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type MintedToken = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  creator: {
    address: string;
    avatar: string;
  };
  marketCap: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  holders: number;
  createdAt: Date;
  lastTradeAt: Date;
  description: string;
  liquidity: number;
  fdv: number;
};

type TokenCardProps = {
  token: MintedToken;
  locale: string | undefined;
  className?: string;
  viewMode?: "list" | "grid";
  showHoverGradient?: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TokenCard({
  token,
  locale,
  className,
  viewMode = "grid",
  showHoverGradient = false,
}: TokenCardProps) {
  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const formatPrice = (price: number) => {
    if (price < 0.001) {
      return `$${price.toFixed(6)}`;
    }
    return `$${price.toFixed(4)}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`;
    }
    if (marketCap >= 1000) {
      return `$${(marketCap / 1000).toFixed(1)}K`;
    }
    return `$${marketCap.toFixed(0)}`;
  };

  const formatRelativeDate = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "fr" ? fr : enUS,
    });
  };

  const isPositiveChange = token.priceChange24h > 0;

  // ============================================================================
  // SHARED CARD CONTENT (used in list view)
  // ============================================================================

  const CardContent = (
    <>
      {/* Token Image + Basic Info */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="relative w-12 h-12 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
          <Image
            src={token.image}
            alt={token.name}
            fill
            sizes="48px"
            className="object-cover"
            priority
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-bold text-base text-gray-100">${token.symbol}</p>
            <div
              className={cn(
                "flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                isPositiveChange
                  ? "bg-emerald-500/20 text-emerald-300"
                  : "bg-red-500/20 text-red-300"
              )}
            >
              {isPositiveChange ? "+" : ""}
              {token.priceChange24h.toFixed(1)}%
            </div>
          </div>
          <p className="text-sm text-gray-400 truncate">{token.name}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center justify-between flex-1 ml-4">
        {/* Price */}
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="text-base font-semibold text-gray-100">
            {formatPrice(token.price)}
          </span>
        </div>

        {/* Market Cap */}
        <div className="flex flex-col items-center min-w-[100px]">
          <span className="text-sm font-medium text-gray-200">
            {formatMarketCap(token.marketCap)}
          </span>
        </div>

        {/* Volume 24h */}
        <div className="flex flex-col items-center min-w-[90px]">
          <span className="text-sm font-medium text-gray-200">
            {formatMarketCap(token.volume24h)}
          </span>
        </div>

        {/* Holders */}
        <div className="flex flex-col items-center min-w-[80px]">
          <span className="text-sm font-medium text-gray-200">
            {token.holders > 1000
              ? `${(token.holders / 1000).toFixed(1)}K`
              : token.holders}
          </span>
        </div>

        {/* Created */}
        <div className="flex flex-col items-center min-w-[120px]">
          <span className="text-xs text-gray-400">
            {formatRelativeDate(token.createdAt)}
          </span>
        </div>
      </div>
    </>
  );

  // Grid View (Default)
  if (viewMode === "grid") {
    return (
      <Link href={`/${locale}/token/${token.id}`} className="block">
        <div
          className={cn(
            "group relative bg-gradient-to-br from-gray-800/40 to-gray-900/60 rounded-xl overflow-hidden",
            "border border-gray-700/50 backdrop-blur-sm",
            "hover:border-gray-600/50 hover:shadow-xl hover:shadow-purple-500/10",
            "transition-all duration-300 hover:-translate-y-1",
            "cursor-pointer h-full",
            showHoverGradient && "hover-gradient-border",
            className
          )}
        >
          {/* Gradient Overlay for hover effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          {/* Header Section with Token Image */}
          <div className="relative h-32 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-700/20 to-gray-900/40" />
            <Image
              src={token.image}
              alt={token.name}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              priority
            />

            {/* Price Change Badge */}
            <div className="absolute top-3 right-3">
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold backdrop-blur-sm",
                  isPositiveChange
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-red-500/20 text-red-300 border border-red-500/30"
                )}
              >
                {isPositiveChange ? (
                  <TrendingUp size={10} />
                ) : (
                  <TrendingDown size={10} />
                )}
                {isPositiveChange ? "+" : ""}
                {token.priceChange24h.toFixed(1)}%
              </div>
            </div>

            {/* Creator Avatar */}
            <div className="absolute bottom-3 left-3">
              <div className="w-6 h-6 rounded-full overflow-hidden border border-white/20 backdrop-blur-sm">
                <Image
                  src={token.creator.avatar}
                  alt="Creator"
                  width={24}
                  height={24}
                  className="object-cover"
                />
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4 space-y-3">
            {/* Token Info */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-100 group-hover:text-white transition-colors">
                  ${token.symbol}
                </h3>
                <div className="text-right">
                  <div className="text-base font-semibold text-gray-100">
                    {formatPrice(token.price)}
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-400 truncate pr-2">
                  {token.name}
                </p>
                <p className="text-xs text-gray-500 flex-shrink-0">
                  {formatRelativeDate(token.createdAt)}
                </p>
              </div>
            </div>

            {/* Stats Grid - 2x2 compact */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">MCap</span>
                </div>
                <div className="text-sm font-semibold text-gray-200">
                  {formatMarketCap(token.marketCap)}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                <div className="flex items-center gap-1 mb-1">
                  <Droplet size={6} className="text-blue-400" />
                  <span className="text-xs text-gray-400">Vol</span>
                </div>
                <div className="text-sm font-semibold text-gray-200">
                  {formatMarketCap(token.volume24h)}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                <div className="flex items-center gap-1 mb-1">
                  <Users size={6} className="text-yellow-400" />
                  <span className="text-xs text-gray-400">Holders</span>
                </div>
                <div className="text-sm font-semibold text-gray-200">
                  {token.holders > 1000
                    ? `${(token.holders / 1000).toFixed(1)}K`
                    : token.holders}
                </div>
              </div>

              <div className="bg-gray-800/30 rounded-lg p-2 border border-gray-700/30">
                <div className="flex items-center gap-1 mb-1">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span className="text-xs text-gray-400">Liq</span>
                </div>
                <div className="text-sm font-semibold text-gray-200">
                  {formatMarketCap(token.liquidity)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // List View
  else {
    return (
      <Link href={`/${locale}/token/${token.id}`} className="block">
        <div
          className={cn(
            "flex items-center justify-between bg-gray-800/50 px-4 py-2 rounded-lg",
            className ? className : "border border-gray-700",
            "transition-all duration-200 cursor-pointer",
            "hover:bg-gray-800/70",
            showHoverGradient && "hover-gradient-border"
          )}
        >
          {CardContent}
        </div>
      </Link>
    );
  }
}
