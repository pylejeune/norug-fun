import { DetailedProposal } from "@/app/[locale]/proposal/[id]/page";
import { ProposalSupport, useProgram } from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type ProposalSupportListProps = {
  proposal: DetailedProposal;
};

export default function ProposalSupportList({
  proposal,
}: ProposalSupportListProps) {
  const t = useTranslations("ProposalDetail");
  const { locale } = useParams();
  const { getProposalSupports } = useProgram();
  const [supports, setSupports] = useState<ProposalSupport[]>([]);
  const [isLoadingSupports, setIsLoadingSupports] = useState(true);

  useEffect(() => {
    const loadSupports = async () => {
      if (!proposal?.publicKey || !getProposalSupports) return;

      try {
        setIsLoadingSupports(true);
        const proposalSupports = await getProposalSupports(
          proposal.publicKey.toString()
        );
        setSupports(proposalSupports);
      } catch (error) {
        // Handle error if needed
      } finally {
        setIsLoadingSupports(false);
      }
    };

    loadSupports();
  }, [proposal?.publicKey, getProposalSupports]);

  return (
    <div className="bg-gray-800/50 p-4 rounded-lg">
      <h2 className="text-lg font-medium mb-4">
        {t("supporters")}
        {supports.length > 20 && (
          <span className="text-sm text-gray-400 ml-2">
            ({t("showingTop20")})
          </span>
        )}
      </h2>

      {isLoadingSupports ? (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
        </div>
      ) : supports.length === 0 ? (
        <div className="text-center text-gray-400 py-4">
          {t("noSupportersYet")}
        </div>
      ) : (
        <div className="space-y-4">
          {[...supports]
            .map((support) => ({
              ...support,
              totalTokens:
                support.user.toString() === proposal.creator.toString()
                  ? support.tokenAllocation + proposal.creatorAllocation
                  : support.tokenAllocation,
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 20)
            .map((support, index) => {
              const isCreator =
                support.user.toString() === proposal.creator.toString();
              return (
                <div
                  key={index}
                  className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-500">#{index + 1}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/${locale}/profile/${support.user.toString()}`}
                          className="font-mono text-sm text-gray-400 hover:underline hover:text-[#e6d3ba] transition-colors"
                        >
                          {support.user.toBase58().slice(0, 4)}...
                          {support.user.toBase58().slice(-4)}
                        </Link>
                        {isCreator && (
                          <span
                            className="text-green-400 cursor-help"
                            title={t("creatorWallet")}
                          >
                            🌱
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-300">
                        {new Date(support.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-medium">
                      {support.amount.toLocaleString(locale as string, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      SOL
                    </p>
                    <p className="text-sm text-gray-400">
                      {support.tokenAllocation.toLocaleString(
                        locale as string,
                        {
                          maximumFractionDigits: 2,
                        }
                      )}
                      % {t("ofTokens")}
                      {isCreator && (
                        <span className="ml-1 text-green-400">
                          (+{proposal.creatorAllocation}%{" "}
                          {t("creatorAllocation")})
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
