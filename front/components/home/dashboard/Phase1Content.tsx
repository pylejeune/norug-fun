"use client";

import Loading from "@/app/[locale]/loading";
import { EpochCountdown } from "@/components/home/EpochCountdown";
import { FilterPanel } from "@/components/ui/FilterPanel";
import { Pagination } from "@/components/ui/Pagination";
import { EpochState } from "@/context/ProgramContext";
import { useProposals } from "@/hooks/useSWRHooks";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { ProposalGrid } from "./ProposalGrid";

type Phase1ContentProps = {
  selectedEpochId?: string;
  selectedEpochDetails: EpochState | null;
  locale: string | undefined;
  isLoadingEpochs: boolean;
  search: string;
  viewMode: "list" | "grid";
  showFilters: boolean;
  onShowFiltersChange: (show: boolean) => void;
};

export function Phase1Content({
  selectedEpochId,
  selectedEpochDetails,
  locale,
  isLoadingEpochs,
  search,
  viewMode,
  showFilters,
  onShowFiltersChange,
}: Phase1ContentProps) {
  const t = useTranslations("Home");
  const { proposals, isLoading } = useProposals(selectedEpochId);

  // ============================================================================
  // STATE MANAGEMENT
  // ============================================================================

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<"sol" | "date" | "name">("sol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // Pending filter state (for filters view)
  const [pendingSortBy, setPendingSortBy] = useState(sortBy);
  const [pendingSortOrder, setPendingSortOrder] = useState(sortOrder);

  // ============================================================================
  // DATA PROCESSING AND FILTERING
  // ============================================================================

  // Apply search and sorting to proposals
  const sortedFilteredProposals = useMemo(() => {
    // Filter by search term
    let filtered = proposals.filter(
      (p) =>
        p.tokenName.toLowerCase().includes(search.toLowerCase()) ||
        p.tokenSymbol.toLowerCase().includes(search.toLowerCase())
    );

    // Apply sorting
    let sorted = [...filtered];
    switch (sortBy) {
      case "date":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.creationTimestamp - a.creationTimestamp
            : a.creationTimestamp - b.creationTimestamp
        );
        break;
      case "name":
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.tokenName.localeCompare(a.tokenName)
            : a.tokenName.localeCompare(b.tokenName)
        );
        break;
      default: // "sol"
        sorted.sort((a, b) =>
          sortOrder === "desc"
            ? b.solRaised - a.solRaised
            : a.solRaised - b.solRaised
        );
    }
    return sorted;
  }, [proposals, sortBy, sortOrder, search]);

  // Apply pagination to filtered results
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedFilteredProposals.slice(start, end);
  }, [sortedFilteredProposals, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedFilteredProposals.length / itemsPerPage);

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
      {/* Epoch Countdown Timer */}
      {selectedEpochDetails && (
        <EpochCountdown
          endTimestamp={selectedEpochDetails.endTime}
          className="mb-4"
        />
      )}

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
      {isLoadingEpochs ? (
        // Loading State
        <div className="flex justify-center py-16">
          <Loading />
        </div>
      ) : !selectedEpochId ? (
        // No Active Epochs State
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-300">
            {t("noActiveEpochs")}
          </h2>
        </div>
      ) : isLoading ? (
        // Loading Proposals State
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : sortedFilteredProposals.length === 0 ? (
        // No Proposals Found State
        <div className="text-center py-8 text-gray-400">{t("noProposals")}</div>
      ) : (
        // Proposals Display
        <>
          <ProposalGrid
            proposals={paginatedProposals}
            locale={locale}
            viewMode={viewMode}
          />

          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            itemsPerPage={itemsPerPage}
            totalItems={sortedFilteredProposals.length}
            onPageChange={handlePageChange}
            onItemsPerPageChange={handleItemsPerPageChange}
          />
        </>
      )}
    </div>
  );
}
