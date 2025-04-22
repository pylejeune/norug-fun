import { ProposalState } from "@/context/ProgramContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useTranslations } from "next-intl";
import Link from "next/link";

type ProposalCardProps = {
  proposal: ProposalState;
  locale: string | undefined;
};

export function ProposalCard({ proposal, locale }: ProposalCardProps) {
  const t = useTranslations("Home");

  return (
    <div
      className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 
      hover:border-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl
      transform hover:-translate-y-1"
    >
      {/* Image placeholder - à remplacer par l'image réelle */}
      <div className="h-48 bg-gray-700 animate-pulse"></div>

      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-gray-100">
            {proposal.tokenName}
          </h3>
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-400">${proposal.tokenSymbol}</p>
            <p className="text-xs text-gray-500">
              {t("by")} {proposal.creator.toString().slice(0, 4)}...
              {proposal.creator.toString().slice(-4)}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center text-sm text-gray-300">
          <span>
            {t("solanaRaised", {
              amount: (proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2),
            })}
          </span>
          <span className="text-gray-400">
            {t("totalContributions", {
              count: proposal.totalContributions,
            })}
          </span>
        </div>

        <Link
          href={`/${
            locale || "en"
          }/proposal/${proposal.publicKey.toString()}#support`}
          className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg
            hover:bg-green-700 transition-colors duration-200"
        >
          {t("supportProject")}
        </Link>
      </div>
    </div>
  );
}
