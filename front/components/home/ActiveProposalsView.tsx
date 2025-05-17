import EpochSelector from "@/components/epoch/EpochSelector";
import { ProposalCard } from "@/components/home/ProposalCard";
import { EpochState, ProposalState } from "@/context/ProgramContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useMemo } from "react";

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

  const sortedFilteredProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => b.solRaised - a.solRaised);
  }, [filteredProposals]);

  return (
    <>
      {/* Container for Epoch Selector and Details Card */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <EpochSelector
          selectedEpochId={selectedEpochId}
          onSelect={onSelectEpoch}
          activeOnly
        />

        {/* Epoch Details Card - remove its own margins */}
        {selectedEpochDetails && (
          <div className="px-6 py-2 bg-gray-800/50 rounded-xl border border-gray-700 flex-grow md:flex-grow-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <h3 className="text-sm text-gray-400 mb-1">{t("epochStart")}</h3>
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
                  {format(new Date(selectedEpochDetails.endTime * 1000), "PPp", {
                    locale: locale === "fr" ? fr : enUS,
                  })}
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
            } else if (index < 10) {
              borderClass = "gradient-border gradient-border-blue";
            } else {
              borderClass = "border-1 border-red-900";
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
