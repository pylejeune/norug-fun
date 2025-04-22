import EpochSelector from "@/components/epoch/EpochSelector";
import { EpochState, ProposalState } from "@/context/ProgramContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useTranslations } from "next-intl";
import Link from "next/link";

type PreviousEpochsViewProps = {
  selectedEpochId?: string;
  selectedEpochDetails: EpochState | null;
  sortedProposals: ProposalState[];
  onSelectEpoch: (epochId: string) => void;
  locale: string | undefined;
};

export function PreviousEpochsView({
  selectedEpochId,
  selectedEpochDetails,
  sortedProposals,
  onSelectEpoch,
  locale,
}: PreviousEpochsViewProps) {
  const t = useTranslations("Home");

  return (
    <>
      <EpochSelector
        selectedEpochId={selectedEpochId}
        onSelect={onSelectEpoch}
        completedOnly
      />
      {selectedEpochDetails && (
        <div className="mt-6 mb-8">
          <h2 className="text-xl font-bold mb-4">{t("topProposals")}</h2>
          <div className="space-y-4">
            {sortedProposals.map((proposal, index) => (
              <Link
                key={proposal.publicKey.toString()}
                href={`/${
                  locale || "en"
                }/proposal/${proposal.publicKey.toString()}`}
                className="block"
              >
                <div
                  className={`p-4 rounded-lg border transition-colors duration-200 
                    hover:bg-opacity-75 cursor-pointer ${
                      index < 10
                        ? "bg-green-900/20 border-green-600 hover:bg-green-900/30"
                        : "bg-gray-800/50 border-gray-700 hover:bg-gray-800/70"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold">{proposal.tokenName}</h3>
                      <p className="text-sm text-gray-400">
                        {t("rank", { rank: index + 1 })}
                        {index < 10 && (
                          <span className="ml-2 text-green-500">
                            {t("qualifiedForPhase2")}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        {(proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2)} SOL
                      </p>
                      <p className="text-sm text-gray-400">
                        {t("contributions", {
                          count: proposal.totalContributions,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
