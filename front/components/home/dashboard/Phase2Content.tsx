"use client";

import { FilterPanel } from "@/components/ui/FilterPanel";
import { Pagination } from "@/components/ui/Pagination";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { TokenGrid } from "./TokenGrid";

type Phase2ContentProps = {
  locale: string | undefined;
  search: string;
  viewMode: "list" | "grid";
  showFilters: boolean;
  onShowFiltersChange: (show: boolean) => void;
};

// Mock data pour les tokens mintés
const MINTED_TOKENS = [
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
    createdAt: new Date(Date.now() - 3600000), // il y a 1 heure
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
    createdAt: new Date(Date.now() - 7200000), // il y a 2 heures
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
    createdAt: new Date(Date.now() - 1800000), // il y a 30 minutes
    description: "AI-powered analytics platform for DeFi trading strategies",
    liquidity: 675000,
    fdv: 4290000,
  },
];

export function Phase2Content({
  locale,
  search,
  viewMode,
  showFilters,
  onShowFiltersChange,
}: Phase2ContentProps) {
  const t = useTranslations("Home");

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<"sol" | "date" | "name">("sol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Pending filter state (for filters view)
  const [pendingSortBy, setPendingSortBy] = useState(sortBy);
  const [pendingSortOrder, setPendingSortOrder] = useState(sortOrder);

  // ============================================================================
  // DATA PROCESSING AND FILTERING
  // ============================================================================

  // Apply search and sorting to tokens
  const sortedFilteredTokens = useMemo(() => {
    // Filter by search term
    let filtered = MINTED_TOKENS.filter(
      (token) =>
        token.name.toLowerCase().includes(search.toLowerCase()) ||
        token.symbol.toLowerCase().includes(search.toLowerCase())
    );

    // Apply sorting
    let sorted = [...filtered];
    switch (sortBy) {
      case "date":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.createdAt.getTime() - a.createdAt.getTime()
            : a.createdAt.getTime() - b.createdAt.getTime()
        );
        break;
      case "name":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.name.localeCompare(a.name)
            : a.name.localeCompare(b.name)
        );
        break;
      default: // "sol" - treated as market cap for tokens
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.marketCap - a.marketCap
            : a.marketCap - b.marketCap
        );
    }
    return sorted;
  }, [search, sortBy, sortOrder]);

  // Apply pagination to filtered results
  const paginatedTokens = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedFilteredTokens.slice(start, end);
  }, [sortedFilteredTokens, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedFilteredTokens.length / itemsPerPage);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  // Apply filters from filter panel
  const applyFilters = () => {
    setSortBy(pendingSortBy);
    setSortOrder(pendingSortOrder);
    onShowFiltersChange(false);
  };

  // Reset filters to default
  const resetFilters = () => {
    setPendingSortBy("sol");
    setPendingSortOrder("desc");
    setSortBy("sol");
    setSortOrder("desc");
    onShowFiltersChange(false);
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  // ============================================================================
  // SIDE EFFECTS
  // ============================================================================

  // Reset current page when search or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, sortOrder]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div>
      {/* Filter Panel */}
      <FilterPanel
        isOpen={showFilters}
        onClose={() => onShowFiltersChange(false)}
        sortBy={sortBy}
        sortOrder={sortOrder}
        pendingSortBy={pendingSortBy}
        pendingSortOrder={pendingSortOrder}
        onPendingSortByChange={setPendingSortBy}
        onPendingSortOrderChange={setPendingSortOrder}
        onApply={applyFilters}
        onReset={resetFilters}
      />

      {/* Main Content Area */}
      {sortedFilteredTokens.length === 0 ? (
        // No Tokens Found State
        <div className="text-center py-8 text-gray-400">
          {search
            ? "No tokens found matching your search"
            : "No tokens available"}
        </div>
      ) : (
        // Tokens Display
        <>
          <TokenGrid
            tokens={paginatedTokens}
            locale={locale}
            viewMode={viewMode}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              itemsPerPage={itemsPerPage}
              totalItems={sortedFilteredTokens.length}
              onPageChange={handlePageChange}
              onItemsPerPageChange={handleItemsPerPageChange}
            />
          )}
        </>
      )}
    </div>
  );
}
