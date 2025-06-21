"use client";

import { MintedToken } from "@/components/home/TokenCard";
import { TradingViewChart } from "@/components/TradingViewChart";
import BackButton from "@/components/ui/BackButton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import {
  Activity,
  BarChart3,
  Droplet,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

// ============================================================================
// MOCK DATA - Phase 2 Minted Tokens
// ============================================================================
// Mock data for minted tokens (same as Phase2Content)
const MINTED_TOKENS: MintedToken[] = [
  {
    id: "alpha-token",
    symbol: "ALPHA",
    name: "Alpha Protocol",
    image: "/tokenDemo/alpha.png",
    creator: {
      address: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      avatar: "/images/default-profile.png",
    },
    marketCap: 1247000,
    price: 0.0247,
    priceChange24h: 15.32,
    volume24h: 89420,
    holders: 1247,
    createdAt: new Date(Date.now() - 3600000),
    description:
      "Revolutionary DeFi protocol bringing next-gen yield farming to Solana",
    liquidity: 445000,
    fdv: 2470000,
  },
  {
    id: "beta-token",
    symbol: "BETA",
    name: "Beta Networks",
    image: "/tokenDemo/beta.png",
    creator: {
      address: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      avatar: "/images/default-profile.png",
    },
    marketCap: 892000,
    price: 0.0178,
    priceChange24h: -8.47,
    volume24h: 67200,
    holders: 892,
    createdAt: new Date(Date.now() - 7200000),
    description: "Cross-chain infrastructure for seamless Web3 experiences",
    liquidity: 320000,
    fdv: 1780000,
  },
  {
    id: "gamma-token",
    symbol: "GAMMA",
    name: "Gamma Vision",
    image: "/tokenDemo/gamma.png",
    creator: {
      address: "5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      avatar: "/images/default-profile.png",
    },
    marketCap: 2145000,
    price: 0.0429,
    priceChange24h: 24.78,
    volume24h: 124500,
    holders: 2134,
    createdAt: new Date(Date.now() - 1800000),
    description: "AI-powered analytics platform for DeFi trading strategies",
    liquidity: 675000,
    fdv: 4290000,
  },
];

// ============================================================================
// UTILITY FUNCTIONS - Data Generation
// ============================================================================
// Function to generate recent trades based on the token
const generateRecentTrades = (token: any) => {
  const trades = [
    {
      type: "buy" as const,
      solPrice: token.price * 1.02,
      tokenAmount: 125.67,
      timestamp: new Date(Date.now() - 300000),
      txHash: "5KJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mN",
      account: {
        avatar: "/images/default-profile.png",
        address: "8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJ",
      },
    },
    {
      type: "sell" as const,
      solPrice: token.price * 0.98,
      tokenAmount: 89.34,
      timestamp: new Date(Date.now() - 450000),
      txHash: "3MJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mO",
      account: {
        avatar: "/images/default-profile.png",
        address: "6xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuK",
      },
    },
    {
      type: "buy" as const,
      solPrice: token.price * 1.01,
      tokenAmount: 234.12,
      timestamp: new Date(Date.now() - 600000),
      txHash: "7LJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mP",
      account: {
        avatar: "/images/default-profile.png",
        address: "4xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuL",
      },
    },
    {
      type: "sell" as const,
      solPrice: token.price * 0.99,
      tokenAmount: 67.89,
      timestamp: new Date(Date.now() - 750000),
      txHash: "9NJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mQ",
      account: {
        avatar: "/images/default-profile.png",
        address: "2xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuM",
      },
    },
    {
      type: "buy" as const,
      solPrice: token.price * 1.03,
      tokenAmount: 156.45,
      timestamp: new Date(Date.now() - 900000),
      txHash: "1PJp9X2zQw8uB3vR7nM4tE6yH1sL9kF2pA8dC3xG7mR",
      account: {
        avatar: "/images/default-profile.png",
        address: "9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuN",
      },
    },
  ];

  return trades;
};

// Function to generate simple top holders
const generateTopHolders = (token: any) => {
  const holders = [
    {
      address: "FmJ5Ct2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgHrv",
      percentage: 18.64,
    },
    {
      address: "GUHs6X8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJ",
      percentage: 15.42,
    },
    {
      address: "5TrUwK3xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuK",
      percentage: 12.4,
    },
    {
      address: "DwtkU76xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuL",
      percentage: 9.21,
    },
    {
      address: "EcErqZ4xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuM",
      percentage: 7.08,
    },
    {
      address: "BQ5dHx2xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuN",
      percentage: 5.73,
    },
    {
      address: "7KxivV9xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuO",
      percentage: 4.01,
    },
    {
      address: "96sMvy7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuP",
      percentage: 3.89,
    },
    {
      address: "G2z3iu5xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuQ",
      percentage: 2.67,
    },
    {
      address: "Gm1wb8xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuR",
      percentage: 2.45,
    },
    {
      address: "4BwL7M1xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuS",
      percentage: 1.23,
    },
  ];

  return holders.map((holder, i) => ({
    rank: i + 1,
    address: holder.address,
    percentage: holder.percentage,
    displayName: `${holder.address.slice(0, 6)}...${holder.address.slice(-6)}`,
  }));
};

// ============================================================================
// MAIN COMPONENT - Token Detail Page
// ============================================================================
export default function TokenPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const locale = params.locale as string;

  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "trades">("info");

  // Find the token by ID
  const token = MINTED_TOKENS.find((t) => t.id === tokenId);

  if (!token) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-300 mb-4">
            Token not found
          </h1>
          <BackButton />
        </div>
      </div>
    );
  }

  // Generate data based on current token
  const TOP_HOLDERS = generateTopHolders(token);
  const RECENT_TRADES = generateRecentTrades(token);

  // ============================================================================
  // FORMATTING FUNCTIONS
  // ============================================================================
  const formatPrice = (price: number) => {
    if (price < 0.001) return `$${price.toFixed(6)}`;
    return `$${price.toFixed(4)}`;
  };

  const formatMarketCap = (marketCap: number) => {
    if (marketCap >= 1000000) return `$${(marketCap / 1000000).toFixed(2)}M`;
    if (marketCap >= 1000) return `$${(marketCap / 1000).toFixed(1)}K`;
    return `$${marketCap.toFixed(0)}`;
  };

  const formatRelativeDate = (date: Date) => {
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "fr" ? fr : enUS,
    });
  };

  const isPositiveChange = token.priceChange24h > 0;

  return (
    <div className="text-white">
      {/* ============================================================================ */}
      {/* HEADER SECTION - Mobile & Desktop Layouts */}
      {/* ============================================================================ */}
      <div className="border-b border-gray-800 sticky top-0 z-10">
        <div className="px-4 py-2">
          {/* Mobile Layout: 2 separate lines */}
          <div className="block sm:hidden space-y-3">
            {/* Line 1: Back button only */}
            <div>
              <BackButton />
            </div>

            {/* Line 2: Token info and price */}
            <div className="flex items-center gap-3">
              <Image
                src={token.image}
                alt={token.name}
                width={40}
                height={40}
                className="rounded-full flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h1 className="text-lg font-bold">${token.symbol}</h1>
                <p className="text-gray-400 text-sm">{token.name}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold">
                  {formatPrice(token.price)}
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end gap-1 text-xs font-semibold",
                    isPositiveChange ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {isPositiveChange ? (
                    <TrendingUp size={12} />
                  ) : (
                    <TrendingDown size={12} />
                  )}
                  {isPositiveChange ? "+" : ""}
                  {token.priceChange24h.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Layout: pump.fun style */}
          <div className="hidden sm:block">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <BackButton />
                <Image
                  src={token.image}
                  alt={token.name}
                  width={48}
                  height={48}
                  className="rounded-full flex-shrink-0"
                />
                <div>
                  <h1 className="text-2xl font-bold">${token.symbol}</h1>
                  <p className="text-gray-400">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {formatPrice(token.price)}
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end gap-2 text-base font-semibold",
                    isPositiveChange ? "text-emerald-400" : "text-red-400"
                  )}
                >
                  {isPositiveChange ? (
                    <TrendingUp size={18} />
                  ) : (
                    <TrendingDown size={18} />
                  )}
                  {isPositiveChange ? "+" : ""}
                  {token.priceChange24h.toFixed(2)}%
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* ============================================================================ */}
        {/* MOBILE LAYOUT - Stats Cards & Chart */}
        {/* ============================================================================ */}
        <div className="block sm:hidden space-y-4">
          {/* Stats Cards - Mobile */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={14} className="text-emerald-400" />
                <span className="text-xs text-gray-400">Market Cap</span>
              </div>
              <div className="text-base font-bold">
                {formatMarketCap(token.marketCap)}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={14} className="text-blue-400" />
                <span className="text-xs text-gray-400">24h Volume</span>
              </div>
              <div className="text-base font-bold">
                {formatMarketCap(token.volume24h)}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Users size={14} className="text-yellow-400" />
                <span className="text-xs text-gray-400">Holders</span>
              </div>
              <div className="text-base font-bold">
                {token.holders > 1000
                  ? `${(token.holders / 1000).toFixed(1)}K`
                  : token.holders.toString()}
              </div>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Droplet size={14} className="text-purple-400" />
                <span className="text-xs text-gray-400">Liquidity</span>
              </div>
              <div className="text-base font-bold">
                {formatMarketCap(token.liquidity)}
              </div>
            </div>
          </div>

          {/* TradingView Chart - Mobile */}
          <div className="bg-gray-800/50 rounded-lg border border-gray-700 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Price Chart</h2>
              <div className="text-xs text-gray-400">
                Real-time data from TradingView
              </div>
            </div>
            <TradingViewChart height={280} className="relative" />
          </div>
        </div>

        {/* ============================================================================ */}
        {/* DESKTOP LAYOUT - Chart & Trading Sidebar */}
        {/* ============================================================================ */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-12 gap-6">
            {/* Main Chart - Takes most space */}
            <div className="col-span-8">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3 h-fit">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold">Price Chart</h2>
                  <div className="text-sm text-gray-400">
                    Real-time data from TradingView
                  </div>
                </div>
                <TradingViewChart height={350} className="relative" />
              </div>
            </div>

            {/* Right Sidebar - Trading & Stats */}
            <div className="col-span-4 space-y-4">
              {/* Trading Section */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                <h3 className="text-lg font-bold mb-4">Quick Trade</h3>
                <div className="space-y-4">
                  {/* Buy/Sell Tabs */}
                  <div className="flex bg-gray-700/50 rounded-lg p-1">
                    <button
                      onClick={() => setTradeType("buy")}
                      className={cn(
                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                        tradeType === "buy"
                          ? "bg-emerald-600 text-white"
                          : "text-gray-400 hover:text-gray-300"
                      )}
                    >
                      Buy
                    </button>
                    <button
                      onClick={() => setTradeType("sell")}
                      className={cn(
                        "flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors",
                        tradeType === "sell"
                          ? "bg-red-800 text-white"
                          : "text-gray-400 hover:text-gray-300"
                      )}
                    >
                      Sell
                    </button>
                  </div>

                  {/* Amount Input */}
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">
                      Amount ({token.symbol})
                    </label>
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:border-emerald-500 focus:outline-none"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Trade Button */}
                  <button
                    className={cn(
                      "w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200",
                      tradeType === "buy"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-red-800 hover:bg-red-900 text-white"
                    )}
                  >
                    log in to trade
                  </button>
                </div>
              </div>

              {/* Stats Grid 2x2 */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <BarChart3 size={14} className="text-emerald-400" />
                      <span className="text-xs text-gray-400">Market Cap</span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatMarketCap(token.marketCap)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Activity size={14} className="text-blue-400" />
                      <span className="text-xs text-gray-400">24h Volume</span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatMarketCap(token.volume24h)}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Users size={14} className="text-yellow-400" />
                      <span className="text-xs text-gray-400">Holders</span>
                    </div>
                    <div className="text-lg font-bold">
                      {token.holders > 1000
                        ? `${(token.holders / 1000).toFixed(1)}K`
                        : token.holders.toString()}
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <Droplet size={14} className="text-purple-400" />
                      <span className="text-xs text-gray-400">Liquidity</span>
                    </div>
                    <div className="text-lg font-bold">
                      {formatMarketCap(token.liquidity)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================================ */}
        {/* BOTTOM SECTION - Info/Trades Panel & Top Holders */}
        {/* ============================================================================ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Left Panel - Token Info / Last Trades - Aligned with TradingView */}
          <div className="lg:col-span-8 bg-gray-800/50 rounded-xl border border-gray-700">
            {/* Tabs */}
            <div className="flex border-b border-gray-700">
              <button
                onClick={() => setActiveTab("info")}
                className={cn(
                  "flex-1 px-6 py-4 font-medium transition-colors",
                  activeTab === "info"
                    ? "text-emerald-400 border-b-2 border-emerald-400 bg-gray-700/30"
                    : "text-gray-400 hover:text-gray-300"
                )}
              >
                Token Info
              </button>
              <button
                onClick={() => setActiveTab("trades")}
                className={cn(
                  "flex-1 px-6 py-4 font-medium transition-colors",
                  activeTab === "trades"
                    ? "text-emerald-400 border-b-2 border-emerald-400 bg-gray-700/30"
                    : "text-gray-400 hover:text-gray-300"
                )}
              >
                Last Trades
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {activeTab === "info" && (
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span>{token.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Symbol:</span>
                      <span>{token.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Created:</span>
                      <span>{formatRelativeDate(token.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        Fully Diluted Value:
                      </span>
                      <span>{formatMarketCap(token.fdv)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-md font-bold mb-3">Creator</h4>
                    <div className="flex items-center gap-3">
                      <Image
                        src={token.creator.avatar}
                        alt="Creator"
                        width={40}
                        height={40}
                        className="rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm truncate">
                            {token.creator.address.slice(0, 8)}...
                            {token.creator.address.slice(-8)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          Token Creator
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-700">
                    <h4 className="text-md font-bold mb-3">Description</h4>
                    <p className="text-gray-300 leading-relaxed text-sm">
                      {token.description}
                    </p>
                  </div>
                </div>
              )}

              {activeTab === "trades" && (
                <div className="space-y-3">
                  {RECENT_TRADES.map((trade, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Image
                          src={trade.account.avatar}
                          alt="Avatar"
                          width={32}
                          height={32}
                          className="rounded-full"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-gray-400">
                              {trade.account.address.slice(0, 6)}...
                              {trade.account.address.slice(-4)}
                            </span>
                            <span
                              className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                trade.type === "buy"
                                  ? "bg-emerald-600/20 text-emerald-400"
                                  : "bg-red-600/20 text-red-400"
                              )}
                            >
                              {trade.type}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatDistanceToNow(trade.timestamp, {
                              addSuffix: true,
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">
                          {trade.solPrice.toFixed(4)} SOL
                        </div>
                        <div className="text-xs text-gray-400">
                          {trade.tokenAmount.toFixed(2)} {token.symbol}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Top Holders */}
          <div className="lg:col-span-4 bg-gray-800/50 rounded-xl border border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-300">
                👥 top holders
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              {TOP_HOLDERS.map((holder, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-gray-300">
                    {i + 1}.{" "}
                    <Link
                      href={`/${locale}/profile/${holder.address}`}
                      className="hover:text-emerald-400 transition-colors"
                    >
                      {holder.displayName}
                    </Link>
                  </span>
                  <span className="text-white font-medium">
                    {holder.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
