"use client";

import { TradingViewChart } from "@/components/TradingViewChart";
import BackButton from "@/components/ui/BackButton";
import { Button } from "@/components/ui/button";
import {
  findTokenById,
  generateRecentTrades,
  generateTopHolders,
  SIMULATION_CONFIG,
} from "@/lib/mockData";
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
// MAIN COMPONENT - Token Detail Page
// ============================================================================
export default function TokenPage() {
  const params = useParams();
  const tokenId = params.id as string;
  const locale = params.locale as string;

  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState("");
  const [activeTab, setActiveTab] = useState<"info" | "trades">("info");
  const [showTradePanel, setShowTradePanel] = useState(false);
  const [inputCurrency, setInputCurrency] = useState<"SOL" | "TOKEN">("SOL");

  // Find the token by ID
  const token = findTokenById(tokenId);

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
              <div className="flex-1 min-w-0 select-none">
                <h1 className="text-lg font-bold cursor-default">
                  ${token.symbol}
                </h1>
                <p className="text-gray-400 text-sm cursor-default">
                  {token.name}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg font-bold">
                  {formatPrice(token.price)}
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end gap-1 text-xs font-semibold",
                    isPositiveChange ? "text-emerald-400" : "text-red-300"
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
                <div className="select-none">
                  <h1 className="text-2xl font-bold cursor-default">
                    ${token.symbol}
                  </h1>
                  <p className="text-gray-400 cursor-default">{token.name}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {formatPrice(token.price)}
                </div>
                <div
                  className={cn(
                    "flex items-center justify-end gap-2 text-base font-semibold",
                    isPositiveChange ? "text-emerald-400" : "text-red-300"
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

      <div className="px-4 py-4 space-y-4 pb-24 sm:pb-4">
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
          <div className="grid grid-cols-12 gap-6 items-start">
            {/* Main Chart - Takes most space */}
            <div className="col-span-8">
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-3">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xl font-bold">Price Chart</h2>
                  <div className="text-sm text-gray-400">
                    Real-time data from TradingView
                  </div>
                </div>
                <TradingViewChart height={480} className="relative" />
              </div>
            </div>

            {/* Right Sidebar - Trading & Stats */}
            <div className="col-span-4 space-y-4">
              {/* Trading Section */}
              <div className="bg-gray-800/50 rounded-xl border border-gray-700 p-4">
                <div className="space-y-4">
                  {/* Buy/Sell Tabs */}
                  <div className="flex bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setTradeType("buy")}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        tradeType === "buy"
                          ? "bg-emerald-600 text-white"
                          : "text-gray-400"
                      )}
                    >
                      buy
                    </button>
                    <button
                      onClick={() => setTradeType("sell")}
                      className={cn(
                        "flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer",
                        tradeType === "sell"
                          ? "bg-red-900 text-white"
                          : "text-gray-400"
                      )}
                    >
                      sell
                    </button>
                  </div>

                  {/* Switch Currency */}
                  <button
                    onClick={() =>
                      setInputCurrency(
                        inputCurrency === "SOL" ? "TOKEN" : "SOL"
                      )
                    }
                    className="text-sm text-gray-400 hover:text-gray-300 transition-colors border border-dashed border-gray-600 hover:border-gray-500 px-3 py-1 rounded-md cursor-pointer"
                  >
                    switch to {inputCurrency === "SOL" ? token.symbol : "SOL"}
                  </button>

                  {/* Balance */}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">balance:</span>
                    <span className="text-white font-medium text-sm">
                      {inputCurrency === "SOL"
                        ? `${SIMULATION_CONFIG.SOL_BALANCE} SOL`
                        : `${SIMULATION_CONFIG.TOKEN_BALANCE} ${token.symbol}`}
                    </span>
                  </div>

                  {/* Amount Input */}
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white font-medium focus:border-emerald-500 focus:outline-none pr-16 resize-none"
                      placeholder="0.00"
                      style={{ resize: "none" }}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2 select-none pointer-events-none">
                      <span className="text-gray-400 font-medium text-sm cursor-default">
                        {inputCurrency === "SOL" ? "SOL" : token.symbol}
                      </span>
                      {inputCurrency === "SOL" ? (
                        <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                          <span className="text-xs font-bold">≡</span>
                        </div>
                      ) : (
                        <Image
                          src={token.image}
                          alt={token.symbol}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                    </div>
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setAmount("")}
                      className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      reset
                    </button>
                    {inputCurrency === "SOL" ? (
                      <>
                        <button
                          onClick={() =>
                            setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.SMALL)
                          }
                          className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          {SIMULATION_CONFIG.SOL_AMOUNTS.SMALL} SOL
                        </button>
                        <button
                          onClick={() =>
                            setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.MEDIUM)
                          }
                          className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          {SIMULATION_CONFIG.SOL_AMOUNTS.MEDIUM} SOL
                        </button>
                        <button
                          onClick={() =>
                            setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.LARGE)
                          }
                          className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          {SIMULATION_CONFIG.SOL_AMOUNTS.LARGE} SOL
                        </button>
                        <button
                          onClick={() =>
                            setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.MAX)
                          }
                          className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                        >
                          max
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() =>
                          setAmount(SIMULATION_CONFIG.TOKEN_BALANCE)
                        }
                        className="px-3 py-2 bg-gray-700 text-gray-400 rounded-lg text-xs hover:bg-gray-600 transition-colors cursor-pointer"
                      >
                        max
                      </button>
                    )}
                  </div>

                  {/* Trade Button */}
                  <Button
                    className={cn(
                      "w-full py-3 px-4 rounded-xl font-bold transition-all duration-200",
                      tradeType === "buy"
                        ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                        : "bg-red-900 hover:bg-red-800 text-white"
                    )}
                  >
                    place trade
                  </Button>
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
                          <Link
                            href={`/${locale}/profile/${token.creator.address}`}
                            className="font-mono text-sm truncate hover:text-emerald-400 transition-colors"
                          >
                            {token.creator.address.slice(0, 8)}...
                            {token.creator.address.slice(-8)}
                          </Link>
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
                            <Link
                              href={`/${locale}/profile/${trade.account.address}`}
                              className="font-mono text-xs text-gray-400 hover:text-emerald-400 transition-colors"
                            >
                              {trade.account.address.slice(0, 6)}...
                              {trade.account.address.slice(-4)}
                            </Link>
                            <span
                              className={cn(
                                "px-2 py-1 rounded text-xs font-medium",
                                trade.type === "buy"
                                  ? "bg-emerald-600/20 text-emerald-400"
                                  : "bg-red-900/30 text-red-300"
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
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-sm font-medium">
                          {trade.solPrice.toFixed(4)} SOL
                        </div>
                        <div className="text-xs text-gray-400">
                          {trade.tokenAmount.toFixed(2)} {token.symbol}
                        </div>
                        <Link
                          href={`https://solscan.io/tx/${trade.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-gray-400 hover:text-emerald-400 transition-colors"
                        >
                          {trade.txHash.slice(0, 6)}...
                        </Link>
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

      {/* ============================================================================ */}
      {/* MOBILE FIXED BUY BUTTON */}
      {/* ============================================================================ */}
      <div className="block sm:hidden fixed bottom-16 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-sm border-t border-gray-800 p-4">
        <Button
          onClick={() => setShowTradePanel(true)}
          className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg rounded-xl transition-all duration-200"
        >
          buy
        </Button>
      </div>

      {/* ============================================================================ */}
      {/* MOBILE TRADE PANEL - Sliding from bottom */}
      {/* ============================================================================ */}
      {showTradePanel && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-[55] sm:hidden"
            onClick={() => setShowTradePanel(false)}
          />

          {/* Sliding Panel */}
          <div className="fixed bottom-0 left-0 right-0 z-[60] bg-gray-900 rounded-t-2xl border-t border-gray-700 sm:hidden animate-slide-up">
            <div className="p-4">
              {/* Handle bar */}
              <div className="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />

              {/* Close button */}
              <button
                onClick={() => setShowTradePanel(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>

              {/* Buy/Sell Tabs */}
              <div className="flex bg-gray-800 rounded-lg p-1 mb-4">
                <button
                  onClick={() => setTradeType("buy")}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    tradeType === "buy"
                      ? "bg-emerald-600 text-white"
                      : "text-gray-400"
                  )}
                >
                  buy
                </button>
                <button
                  onClick={() => setTradeType("sell")}
                  className={cn(
                    "flex-1 py-3 px-4 rounded-md text-sm font-medium transition-colors cursor-pointer",
                    tradeType === "sell"
                      ? "bg-red-900 text-white"
                      : "text-gray-400"
                  )}
                >
                  sell
                </button>
              </div>

              {/* Switch Currency */}
              <button
                onClick={() =>
                  setInputCurrency(inputCurrency === "SOL" ? "TOKEN" : "SOL")
                }
                className="text-sm text-gray-400 hover:text-gray-300 mb-2 transition-colors border border-dashed border-gray-600 hover:border-gray-500 px-3 py-1 rounded-md cursor-pointer"
              >
                switch to {inputCurrency === "SOL" ? token.symbol : "SOL"}
              </button>

              {/* Balance */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400">balance:</span>
                <span className="text-white font-medium">
                  {inputCurrency === "SOL"
                    ? `${SIMULATION_CONFIG.SOL_BALANCE} SOL`
                    : `${SIMULATION_CONFIG.TOKEN_BALANCE} ${token.symbol}`}
                </span>
              </div>

              {/* Amount Input */}
              <div className="relative mb-4">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-4 py-4 bg-gray-800 border border-gray-600 rounded-xl text-white text-lg font-medium focus:border-emerald-500 focus:outline-none pr-20 resize-none"
                  placeholder="0.00"
                  style={{ resize: "none" }}
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 select-none pointer-events-none">
                  <span className="text-gray-400 font-medium cursor-default">
                    {inputCurrency === "SOL" ? "SOL" : token.symbol}
                  </span>
                  {inputCurrency === "SOL" ? (
                    <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full flex items-center justify-center">
                      <span className="text-xs font-bold">≡</span>
                    </div>
                  ) : (
                    <Image
                      src={token.image}
                      alt={token.symbol}
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                </div>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setAmount("")}
                  className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm cursor-pointer"
                >
                  reset
                </button>
                {inputCurrency === "SOL" ? (
                  <>
                    <button
                      onClick={() =>
                        setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.SMALL)
                      }
                      className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm cursor-pointer"
                    >
                      {SIMULATION_CONFIG.SOL_AMOUNTS.SMALL} SOL
                    </button>
                    <button
                      onClick={() =>
                        setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.MEDIUM)
                      }
                      className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm cursor-pointer"
                    >
                      {SIMULATION_CONFIG.SOL_AMOUNTS.MEDIUM} SOL
                    </button>
                    <button
                      onClick={() =>
                        setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.LARGE)
                      }
                      className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm cursor-pointer"
                    >
                      {SIMULATION_CONFIG.SOL_AMOUNTS.LARGE} SOL
                    </button>
                    <button
                      onClick={() =>
                        setAmount(SIMULATION_CONFIG.SOL_AMOUNTS.MAX)
                      }
                      className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm cursor-pointer"
                    >
                      max
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setAmount(SIMULATION_CONFIG.TOKEN_BALANCE)}
                    className="px-3 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm cursor-pointer"
                  >
                    max
                  </button>
                )}
              </div>

              {/* Place Trade Button */}
              <Button
                className={cn(
                  "w-full py-4 rounded-xl font-bold text-lg transition-all duration-200",
                  tradeType === "buy"
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                    : "bg-red-900 hover:bg-red-800 text-white"
                )}
                onClick={() => setShowTradePanel(false)}
              >
                place trade
              </Button>

              {/* Bottom padding for safe area */}
              <div className="h-8" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
