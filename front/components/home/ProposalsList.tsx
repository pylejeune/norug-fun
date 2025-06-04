import EpochSelector from "@/components/epoch/EpochSelector";
import { ProposalCard } from "@/components/home/ProposalCard";
import { EpochState } from "@/context/ProgramContext";
import { useProposals } from "@/hooks/useProposals";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

// --- Props type definition ---
type ProposalsListProps = {
  selectedEpochId?: string;
  selectedEpochDetails: EpochState | null;
  locale: string | undefined;
  onSelectEpoch: (epochId: string) => void;
};

export function ProposalsList({
  selectedEpochId,
  selectedEpochDetails,
  locale,
  onSelectEpoch,
}: ProposalsListProps) {
  // --- Hooks and state ---
  const t = useTranslations("Home");
  const { proposals, isLoading } = useProposals(selectedEpochId);
  const [sortBy, setSortBy] = useState<"sol" | "date" | "name">("sol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // --- Sorting logic ---
  const sortedFilteredProposals = useMemo(() => {
    let sorted = [...proposals];

    switch (sortBy) {
      case "date":
        sorted.sort((a, b) => {
          return sortOrder === "desc"
            ? b.creationTimestamp - a.creationTimestamp
            : a.creationTimestamp - b.creationTimestamp;
        });
        break;
      case "name":
        sorted.sort((a, b) => {
          return sortOrder === "desc"
            ? b.tokenName.localeCompare(a.tokenName)
            : a.tokenName.localeCompare(b.tokenName);
        });
        break;
      default: // "sol"
        sorted.sort((a, b) => {
          return sortOrder === "desc"
            ? b.solRaised - a.solRaised
            : a.solRaised - b.solRaised;
        });
    }

    return sorted;
  }, [proposals, sortBy, sortOrder]);

  // Pagination calculation
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedFilteredProposals.slice(start, end);
  }, [sortedFilteredProposals, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedFilteredProposals.length / itemsPerPage);

  return (
    <>
      {/* --- Filters and Epoch Selection --- */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <EpochSelector
          selectedEpochId={selectedEpochId}
          onSelect={onSelectEpoch}
          activeOnly
        />
        {/* Sort controls */}
        {selectedEpochDetails && (
          <div className="flex flex-wrap gap-2">
            <select
              className="px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 
                        text-gray-300 border border-gray-700 transition-colors"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value as "sol" | "date" | "name")
              }
            >
              <option value="sol">{t("sortBySolana")}</option>
              <option value="date">{t("sortByDate")}</option>
              <option value="name">{t("sortByName")}</option>
            </select>
            <select
              className="px-4 py-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 
                        text-gray-300 border border-gray-700 transition-colors"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
            >
              <option value="desc">
                {sortBy === "date" ? t("sortByNewest") : t("sortByDesc")}
              </option>
              <option value="asc">
                {sortBy === "date" ? t("sortByOldest") : t("sortByAsc")}
              </option>
            </select>
          </div>
        )}
      </div>

      {/* --- Epoch Details Card --- */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        {selectedEpochDetails && (
          <div className="px-6 py-2 bg-gray-800/50 rounded-xl border border-gray-700 flex-grow md:flex-grow-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <h3 className="text-sm text-gray-400 mb-1">
                  {t("epochStart")}
                </h3>
                <p className="text-lg font-semibold">
                  {format(
                    new Date(selectedEpochDetails.startTime * 1000),
                    "PPp",
                    {
                      locale: locale === "fr" ? fr : enUS,
                    }
                  )}
                </p>
              </div>

              <div className="text-center">
                <h3 className="text-sm text-gray-400 mb-1">{t("epochEnd")}</h3>
                <p className="text-lg font-semibold">
                  {format(
                    new Date(selectedEpochDetails.endTime * 1000),
                    "PPp",
                    {
                      locale: locale === "fr" ? fr : enUS,
                    }
                  )}
                </p>
              </div>

              <div className="text-center">
                <h3 className="text-sm text-gray-400 mb-1">
                  {t("proposalsCount")}
                </h3>
                <p className="text-lg font-semibold">
                  {t("proposalCount", { count: proposals.length })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* --- Proposals List --- */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : paginatedProposals.length > 0 ? (
        <>
          <div className="flex flex-col gap-4">
            {paginatedProposals.map((proposal, index) => {
              let borderClass = "";
              if (index < 3) {
                borderClass = "gradient-border gradient-border-green";
              } else if (index < 7) {
                borderClass = "gradient-border gradient-border-blue";
              } else {
                borderClass = "border-1 border-gray-700";
              }

              return (
                <ProposalCard
                  key={proposal.publicKey.toString()}
                  proposal={proposal}
                  locale={locale}
                  className={borderClass}
                />
              );
            })}
          </div>

          {/* Pagination controls */}
          {sortedFilteredProposals.length > 10 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm">
              <div className="flex items-center gap-4">
                <div className="text-gray-400">
                  {t("pagination.showing", {
                    start: (currentPage - 1) * itemsPerPage + 1,
                    end: Math.min(
                      currentPage * itemsPerPage,
                      sortedFilteredProposals.length
                    ),
                    total: sortedFilteredProposals.length,
                  })}
                </div>

                <select
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1); // Reset to first page when changing items per page
                  }}
                  className="px-3 py-1.5 rounded-lg bg-gray-800/50 hover:bg-gray-800 
                            text-gray-300 border border-gray-700 transition-colors"
                >
                  <option value={10}>
                    {t("pagination.itemsPerPage", { count: 10 })}
                  </option>
                  <option value={50}>
                    {t("pagination.itemsPerPage", { count: 50 })}
                  </option>
                  <option value={100}>
                    {t("pagination.itemsPerPage", { count: 100 })}
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    currentPage === 1
                      ? "bg-gray-800/50 text-gray-500 cursor-not-allowed"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {t("pagination.previous")}
                </button>

                <span className="px-3 py-1.5 bg-gray-800/50 rounded-lg">
                  {currentPage} / {totalPages}
                </span>

                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    currentPage === totalPages
                      ? "bg-gray-800/50 text-gray-500 cursor-not-allowed"
                      : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {t("pagination.next")}
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-400">
          {selectedEpochId
            ? t("noProposalsInEpoch")
            : t("selectEpochToViewProposals")}
        </div>
      )}
    </>
  );
}
