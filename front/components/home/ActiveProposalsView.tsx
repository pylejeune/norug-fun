import EpochSelector from "@/components/epoch/EpochSelector";
import { ProposalCard } from "@/components/home/ProposalCard";
import { EpochState, ProposalState } from "@/context/ProgramContext";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";

type ActiveProposalsViewProps = {
  selectedEpochId?: string;
  selectedEpochDetails: EpochState | null;
  filteredProposals: ProposalState[];
  loading: boolean;
  locale: string | undefined;
  onSelectEpoch: (epochId: string) => void;
};

export function ActiveProposalsView({
  selectedEpochId,
  selectedEpochDetails,
  filteredProposals,
  loading,
  locale,
  onSelectEpoch,
}: ActiveProposalsViewProps) {
  const t = useTranslations("Home");
  const [sortBy, setSortBy] = useState<"sol" | "date" | "name">("sol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const sortedFilteredProposals = useMemo(() => {
    let sorted = [...filteredProposals];

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
  }, [filteredProposals, sortBy, sortOrder]);

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <EpochSelector
          selectedEpochId={selectedEpochId}
          onSelect={onSelectEpoch}
          activeOnly
        />

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

      {/* Container for Epoch Selector and Details Card */}
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
                  {t("proposalCount", { count: filteredProposals.length })}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : sortedFilteredProposals.length > 0 ? (
        <div className="flex flex-col gap-4">
          {sortedFilteredProposals.map((proposal, index) => {
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
