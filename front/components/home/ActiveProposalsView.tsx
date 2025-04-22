import EpochSelector from "@/components/epoch/EpochSelector";
import { ProposalCard } from "@/components/home/ProposalCard";
import { EpochState, ProposalState } from "@/context/ProgramContext";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";

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

  return (
    <>
      <EpochSelector
        selectedEpochId={selectedEpochId}
        onSelect={onSelectEpoch}
        activeOnly
      />
      {selectedEpochDetails && (
        <div className="mt-6 mb-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : filteredProposals.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProposals.map((proposal) => (
            <ProposalCard
              key={proposal.publicKey.toString()}
              proposal={proposal}
              locale={locale}
            />
          ))}
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
