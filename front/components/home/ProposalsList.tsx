import Loading from "@/app/[locale]/loading";
import {
  EpochCountdown,
  LiveIndicator,
} from "@/components/home/EpochCountdown";
import { ProposalCard } from "@/components/home/ProposalCard";
import { EpochState } from "@/context/ProgramContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEpochCountdown } from "@/hooks/useEpochCountdown";
import { useProposals } from "@/hooks/useSWRHooks";
import { Filter, Grid, List, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProposalsListProps = {
  selectedEpochId?: string;
  selectedEpochDetails: EpochState | null;
  locale: string | undefined;
  isLoadingEpochs: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProposalsList({
  selectedEpochId,
  selectedEpochDetails,
  locale,
  isLoadingEpochs,
}: ProposalsListProps) {
  // ============================================================================
  // HOOKS AND STATE MANAGEMENT
  // ============================================================================

  const t = useTranslations("Home");
  const { proposals, isLoading } = useProposals(selectedEpochId);
  const isMobile = useIsMobile();
  const { isExpired } = useEpochCountdown(selectedEpochDetails?.endTime);

  // Only show live indicator if we have epoch details and it's not expired
  const shouldShowLive = selectedEpochDetails && !isExpired && !isLoadingEpochs;

  // Sorting and filtering state
  const [sortBy, setSortBy] = useState<"sol" | "date" | "name">("sol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [search, setSearch] = useState("");

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  // UI state
  const [activeTab, setActiveTab] = useState<"phase1" | "phase2">("phase1");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [showFilters, setShowFilters] = useState(false);

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

  // Open filters view and sync pending values
  const openFilters = () => {
    setPendingSortBy(sortBy);
    setPendingSortOrder(sortOrder);
    setShowFilters(true);
  };

  // ============================================================================
  // SIDE EFFECTS
  // ============================================================================

  // Prevent body scroll when filters view is open
  useEffect(() => {
    if (showFilters) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showFilters]);

  // Reset current page when search or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, sortOrder]);

  // Force grid view on mobile
  useEffect(() => {
    if (isMobile && viewMode !== "grid") setViewMode("grid");
  }, [isMobile, viewMode]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  // Generate border class for proposal ranking
  const getBorderClass = (index: number) => {
    if (index < 3) {
      return "gradient-border gradient-border-green";
    } else if (index < 7) {
      return "gradient-border gradient-border-blue";
    } else {
      return "border-1 border-gray-700";
    }
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div className="pt-8">
      {/* ============================================================================ */}
      {/* HEADER SECTION - Tabs and Controls */}
      {/* ============================================================================ */}

      <div className="flex flex-col gap-2 mb-6 sm:flex-row sm:items-center sm:justify-between">
        {/* Phase Tabs */}
        <div className="flex gap-2 flex-shrink-0">
          <button
            className={`px-6 py-2 rounded-full font-bold transition-colors whitespace-nowrap flex items-center gap-2
              ${
                activeTab === "phase1"
                  ? "bg-[#1e293b] text-[#e6d3ba] shadow"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }
            `}
            onClick={() => setActiveTab("phase1")}
          >
            Phase 1{shouldShowLive && <LiveIndicator isExpired={isExpired} />}
          </button>
          <button
            className={`px-6 py-2 rounded-full font-bold transition-colors whitespace-nowrap
              ${
                activeTab === "phase2"
                  ? "bg-[#1e293b] text-[#e6d3ba] shadow"
                  : "bg-gray-800 text-gray-300 hover:bg-gray-700"
              }
            `}
            onClick={() => setActiveTab("phase2")}
          >
            Phase 2
          </button>
        </div>

        {/* Control Bar - Only shown for Phase 1 */}
        {activeTab === "phase1" && (
          <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
            {/* View Mode Toggle (Hidden on mobile) */}
            <div className={`flex gap-1 ${isMobile ? "hidden" : ""}`}>
              <button
                className={`p-2 rounded-lg transition-colors ${viewMode === "grid" ? "bg-[#e6d3ba] text-[#1e293b]" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                onClick={() => setViewMode("grid")}
                aria-label="Grid View"
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                className={`p-2 rounded-lg transition-colors ${viewMode === "list" ? "bg-[#e6d3ba] text-[#1e293b]" : "bg-gray-800 text-gray-300 hover:bg-gray-700"}`}
                onClick={() => setViewMode("list")}
                aria-label="List View"
              >
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full max-w-xs mx-2">
              <input
                type="text"
                placeholder={t("searchPlaceholder") || "Search..."}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-[#e6d3ba]"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            </div>

            {/* Filters Button */}
            <button
              className="p-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700 flex-shrink-0"
              onClick={openFilters}
              aria-label="Open Filters"
            >
              <Filter className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Epoch Countdown Timer - Only shown for Phase 1 */}
      {activeTab === "phase1" && selectedEpochDetails && (
        <EpochCountdown
          endTimestamp={selectedEpochDetails.endTime}
          className="mb-6"
        />
      )}

      {/* ============================================================================ */}
      {/* FILTERS VIEW */}
      {/* ============================================================================ */}

      {showFilters && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setShowFilters(false)}
            tabIndex={-1}
            aria-label="Close filters"
          />

          {/* Filters Panel */}
          <div className="ml-auto w-full max-w-xs sm:max-w-sm h-full bg-[#181c23] shadow-xl p-6 flex flex-col z-10">
            {/* View Header */}
            <div className="flex items-center justify-between mb-6">
              <span className="text-lg font-bold text-[#e6d3ba]">
                {t("filters") || "Filters"}
              </span>
              <button
                onClick={() => setShowFilters(false)}
                className="p-2 rounded-full hover:bg-gray-700"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Filter Options */}
            <div className="flex-1 flex flex-col gap-6">
              {/* Sort By */}
              <div>
                <label className="block text-sm font-semibold text-[#e6d3ba] mb-2">
                  {t("sortBy") || "Sort by"}
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/50 text-gray-200 border border-gray-700"
                  value={pendingSortBy}
                  onChange={(e) =>
                    setPendingSortBy(e.target.value as typeof sortBy)
                  }
                >
                  <option value="sol">
                    {t("sortBySolana") || "Sol Raised"}
                  </option>
                  <option value="date">{t("sortByDate") || "Date"}</option>
                  <option value="name">{t("sortByName") || "Name"}</option>
                </select>
              </div>

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-semibold text-[#e6d3ba] mb-2">
                  {t("sortOrder") || "Order"}
                </label>
                <select
                  className="w-full px-3 py-2 rounded-lg bg-gray-800/50 text-gray-200 border border-gray-700"
                  value={pendingSortOrder}
                  onChange={(e) =>
                    setPendingSortOrder(e.target.value as typeof sortOrder)
                  }
                >
                  <option value="desc">
                    {t("sortByDesc") || "Descending"}
                  </option>
                  <option value="asc">{t("sortByAsc") || "Ascending"}</option>
                </select>
              </div>
            </div>

            {/* View Actions */}
            <div className="mt-8 flex gap-2">
              <button
                className="flex-1 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600"
                onClick={() => {
                  setPendingSortBy("sol");
                  setPendingSortOrder("desc");
                  setShowFilters(false);
                }}
              >
                Reset
              </button>
              <button
                className="flex-1 py-2 rounded-lg bg-[#e6d3ba] text-[#1e293b] font-bold hover:bg-[#d6c3a0]"
                onClick={() => {
                  setSortBy(pendingSortBy);
                  setSortOrder(pendingSortOrder);
                  setShowFilters(false);
                }}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================================ */}
      {/* MAIN CONTENT AREA */}
      {/* ============================================================================ */}

      {activeTab === "phase1" ? (
        // Phase 1 Content
        isLoadingEpochs ? (
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
        ) : paginatedProposals.length > 0 ? (
          // Proposals Display
          <>
            {/* List View (Desktop only) */}
            {viewMode === "list" && !isMobile ? (
              <div className="flex flex-col gap-4">
                {paginatedProposals.map((proposal, index) => (
                  <ProposalCard
                    key={proposal.publicKey.toString()}
                    proposal={proposal}
                    locale={locale}
                    className={getBorderClass(index)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            ) : (
              // Grid View (Default and Mobile)
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedProposals.map((proposal, index) => (
                  <ProposalCard
                    key={proposal.publicKey.toString()}
                    proposal={proposal}
                    locale={locale}
                    className={getBorderClass(index)}
                    viewMode={viewMode}
                  />
                ))}
              </div>
            )}

            {/* ============================================================================ */}
            {/* PAGINATION SECTION */}
            {/* ============================================================================ */}

            {sortedFilteredProposals.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8 pt-6 border-t border-gray-700">
                {/* Items Per Page Selector */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-400">
                    {t("itemsPerPage") || "Items per page"}:
                  </span>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-3 py-1 rounded-lg bg-gray-800 text-gray-200 border border-gray-700 text-sm"
                  >
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>

                {/* Page Navigation */}
                <div className="flex items-center gap-4">
                  {/* Page Info */}
                  <span className="text-sm text-gray-400">
                    {t("pageInfo", {
                      start: (currentPage - 1) * itemsPerPage + 1,
                      end: Math.min(
                        currentPage * itemsPerPage,
                        sortedFilteredProposals.length
                      ),
                      total: sortedFilteredProposals.length,
                    }) ||
                      `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, sortedFilteredProposals.length)} of ${sortedFilteredProposals.length}`}
                  </span>

                  {/* Navigation Buttons */}
                  <div className="flex gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={() =>
                        setCurrentPage(Math.max(1, currentPage - 1))
                      }
                      disabled={currentPage === 1}
                      className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {t("previous") || "Previous"}
                    </button>

                    {/* Page Indicator */}
                    <span className="px-3 py-1 bg-[#e6d3ba] text-[#1e293b] rounded-lg font-medium text-sm">
                      {currentPage} / {totalPages}
                    </span>

                    {/* Next Button */}
                    <button
                      onClick={() =>
                        setCurrentPage(Math.min(totalPages, currentPage + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {t("next") || "Next"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          // No Proposals Found State
          <div className="text-center py-8 text-gray-400">
            {t("noProposals")}
          </div>
        )
      ) : (
        // Phase 2 Content (Coming Soon)
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-semibold mb-2 text-gray-300">
            Phase 2 (Coming Soon)
          </h2>
        </div>
      )}
    </div>
  );
}
