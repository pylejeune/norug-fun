"use client";

import { useIsMobile } from "@/hooks/use-mobile";
import { MintedToken, TokenCard } from "../TokenCard";

type TokenGridProps = {
  tokens: MintedToken[];
  locale: string | undefined;
  viewMode: "list" | "grid";
};

export function TokenGrid({ tokens, locale, viewMode }: TokenGridProps) {
  const isMobile = useIsMobile();

  if (tokens.length === 0) {
    return null;
  }

  // List View (Desktop only)
  if (viewMode === "list" && !isMobile) {
    return (
      <div className="space-y-2 mb-6">
        {/* Header Row */}
        <div className="flex items-center justify-between px-4 py-2 text-xs font-medium text-gray-400 uppercase tracking-wide border-b border-gray-700/50">
          {/* Token Column */}
          <div className="min-w-[200px]">Token</div>

          {/* Stats Headers - répartis avec justify-between */}
          <div className="flex items-center justify-between flex-1 ml-4">
            {/* Price Column */}
            <div className="flex flex-col items-center min-w-[90px]">Price</div>

            {/* Market Cap Column */}
            <div className="flex flex-col items-center min-w-[100px]">
              Market Cap
            </div>

            {/* Volume Column */}
            <div className="flex flex-col items-center min-w-[90px]">
              Volume 24h
            </div>

            {/* Holders Column */}
            <div className="flex flex-col items-center min-w-[80px]">
              Holders
            </div>

            {/* Created Column */}
            <div className="flex flex-col items-center min-w-[120px]">
              Created
            </div>
          </div>
        </div>

        {/* Token Rows */}
        <div className="space-y-1">
          {tokens.map((token, index) => (
            <TokenCard
              key={token.id}
              token={token}
              locale={locale}
              className="h-full"
              viewMode="list"
              showHoverGradient={true}
            />
          ))}
        </div>
      </div>
    );
  }

  // Grid View (Default and Mobile)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
      {tokens.map((token, index) => (
        <TokenCard
          key={token.id}
          token={token}
          locale={locale}
          className="h-full"
          viewMode="grid"
          showHoverGradient={true}
        />
      ))}
    </div>
  );
}
