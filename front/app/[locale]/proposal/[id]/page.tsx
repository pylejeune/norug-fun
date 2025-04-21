"use client";

import { useProgram } from "@/context/ProgramContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ProposalStatus = "active" | "validated" | "rejected";

type DetailedProposal = {
  id: string;
  name: string;
  ticker: string;
  epoch_id: string;
  solRaised: number;
  creator: PublicKey;
  totalSupply: number;
  creatorAllocation: number;
  supporterAllocation: number;
  status: ProposalStatus;
  totalContributions: number;
  lockupPeriod: number;
  publicKey: PublicKey;
};

export default function ProposalDetailPage() {
  const t = useTranslations("ProposalDetail");
  const { locale, id } = useParams();
  const { publicKey } = useWallet();
  const router = useRouter();
  const [supportAmount, setSupportAmount] = useState<string>("");
  const { getProposalDetails } = useProgram();
  const [proposal, setProposal] = useState<DetailedProposal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProposal = async () => {
      try {
        setLoading(true);
        if (!id) {
          toast.error(t("proposalNotFound"));
          return;
        }

        // Attendre que le programme soit initialisé
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const details = await getProposalDetails(id as string);
        if (!details) {
          toast.error(t("proposalNotFound"));
          return;
        }

        console.log("Proposal details:", details);

        const formattedProposal: DetailedProposal = {
          id: id as string,
          name: details.tokenName,
          ticker: details.tokenSymbol,
          epoch_id: details.epochId,
          solRaised: details.solRaised,
          creator: details.creator,
          totalSupply: details.totalSupply,
          creatorAllocation: details.creatorAllocation,
          supporterAllocation: details.supporterAllocation,
          status: details.status as ProposalStatus,
          totalContributions: details.totalContributions,
          lockupPeriod: details.lockupPeriod,
          publicKey: details.publicKey,
        };

        setProposal(formattedProposal);
      } catch (error) {
        console.error("Failed to load proposal:", error);
        if ((error as Error).message === "Program not initialized") {
          // Réessayer après un délai
          setTimeout(loadProposal, 1000);
        } else {
          toast.error(t("errorLoadingProposal"));
        }
      } finally {
        setLoading(false);
      }
    };

    loadProposal();
  }, [id, getProposalDetails]);

  const formatDate = (date: Date | undefined) => {
    if (!date || isNaN(date.getTime())) return "-";
    try {
      return format(date, "PPpp", {
        locale: locale === "fr" ? fr : enUS,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "-";
    }
  };

  // Fonction helper pour formater les grands nombres
  const formatNumber = (number: number) => {
    return number.toLocaleString(locale === "fr" ? "fr-FR" : "en-US");
  };

  // TODO: Implement support action
  const handleSupport = async (e: React.FormEvent) => {
    console.log("TODO: Support with", supportAmount, "SOL");
  };

  const getStatusString = (status: any): ProposalStatus => {
    if (typeof status === "object") {
      // Si c'est un objet, prendre la première clé
      return Object.keys(status)[0] as ProposalStatus;
    }
    return status as ProposalStatus;
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="text-center py-8 text-gray-400">
        {t("proposalNotFound")}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        <span>{t("backButton")}</span>
      </button>

      <div className="bg-gray-900/50 p-3 md:p-6 rounded-lg border border-gray-800">
        {/* Header */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
          {/* Image Container */}
          <div className="w-full lg:w-1/3 max-w-sm mx-auto lg:mx-0">
            <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">
              {t("noImage")}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            {/* Title Section */}
            <div className="text-center lg:text-left mb-4">
              <h1 className="text-2xl md:text-3xl font-bold mb-2">
                {proposal.name}
              </h1>
              <p className="text-lg font-mono text-gray-400">
                ${proposal.ticker}
              </p>
            </div>

            {/* Stats Section */}
            <div className="flex flex-col items-center lg:items-start gap-2 mb-6">
              <p className="text-xl font-medium text-green-500">
                {t("solanaRaised", {
                  amount: proposal.solRaised.toLocaleString(locale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}
              </p>
              <p
                className={`text-base font-medium ${
                  getStatusString(proposal.status) === "validated"
                    ? "text-green-500"
                    : getStatusString(proposal.status) === "active"
                    ? "text-blue-500"
                    : "text-red-500"
                }`}
              >
                {t(`status.${getStatusString(proposal.status)}`)}
              </p>
            </div>

            {/* Support Form */}
            {publicKey &&
              !publicKey.equals(proposal.creator) &&
              proposal.status === "active" && (
                <form
                  onSubmit={handleSupport}
                  className="space-y-3 max-w-md mx-auto lg:mx-0"
                >
                  <div className="flex flex-col gap-2">
                    <label
                      htmlFor="supportAmount"
                      className="block text-sm font-medium text-gray-400"
                    >
                      {t("supportAmount")}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          id="supportAmount"
                          value={supportAmount}
                          onChange={(e) => setSupportAmount(e.target.value)}
                          min="0"
                          step="0.1"
                          required
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 pr-12 text-white"
                          placeholder="0.0"
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className="text-gray-400">SOL</span>
                        </div>
                      </div>
                      <button
                        type="submit"
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        disabled={!publicKey || !supportAmount}
                      >
                        {publicKey ? t("supportButton") : t("connectToSupport")}
                      </button>
                    </div>
                  </div>
                </form>
              )}
          </div>
        </div>

        {/* Details Sections */}
        <div className="mt-6 space-y-4">
          {/* Tokenomics */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-4">{t("tokenomics")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">{t("totalSupply")}</p>
                <p className="text-lg">{formatNumber(proposal.totalSupply)}</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">
                  {t("creatorAllocation")}
                </p>
                <p className="text-lg">{proposal.creatorAllocation}%</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">
                  {t("supporterAllocation")}
                </p>
                <p className="text-lg">{proposal.supporterAllocation}%</p>
              </div>
            </div>
          </div>

          {/* Project Details */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-4">{t("details")}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">{t("epochId")}</p>
                <p>{proposal.epoch_id}</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">{t("creator")}</p>
                <p className="font-mono break-all">
                  {proposal.creator.toBase58()}
                </p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">
                  {t("totalContributions", {
                    count: proposal.totalContributions,
                  })}
                </p>
                <p>{proposal.totalContributions}</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">
                  {t("lockupPeriod")}
                </p>
                <p>
                  {(proposal.lockupPeriod / 86400).toFixed(0)} {t("days")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
