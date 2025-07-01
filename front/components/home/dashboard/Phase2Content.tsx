"use client";

import { FilterPanel, SortBy, SortOrder } from "@/components/ui/FilterPanel";
import { Pagination } from "@/components/ui/Pagination";
import { MINTED_TOKENS } from "@/lib/mockData";
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
  const [sortBy, setSortBy] = useState<SortBy>("sol");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(12);

  // Pending filter state (for filters view)
  const [pendingSortBy, setPendingSortBy] = useState<SortBy>(sortBy);
  const [pendingSortOrder, setPendingSortOrder] =
    useState<SortOrder>(sortOrder);

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
      case "marketcap":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.marketCap - a.marketCap
            : a.marketCap - b.marketCap
        );
        break;
      case "volume":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.volume24h - a.volume24h
            : a.volume24h - b.volume24h
        );
        break;
      case "holders":
        sorted.sort((a, b) =>
          sortOrder === "desc" ? b.holders - a.holders : a.holders - b.holders
        );
        break;
      case "lasttrade":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.lastTradeAt.getTime() - a.lastTradeAt.getTime()
            : a.lastTradeAt.getTime() - b.lastTradeAt.getTime()
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
        phase="phase2"
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
