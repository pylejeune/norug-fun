"use client";

import BackButton from "@/components/ui/BackButton";
import { useProgram } from "@/context/ProgramContext";
import { ipfsToHttp } from "@/utils/ImageStorage";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type ProposalStatus = "active" | "validated" | "rejected";

type DetailedProposal = {
  id: string;
  name: string;
  ticker: string;
  description: string;
  imageUrl?: string;
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
  // Hooks and context
  const t = useTranslations("ProposalDetail");
  const { locale, id } = useParams();
  const { publicKey } = useWallet();
  const [supportAmount, setSupportAmount] = useState<string>("");
  const { getProposalDetails, supportProposal } = useProgram();
  const [proposal, setProposal] = useState<DetailedProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load proposal details on mount
  useEffect(() => {
    const loadProposal = async () => {
      try {
        setLoading(true);
        if (!id) {
          toast.error(t("proposalNotFound"));
          return;
        }

        // Wait for program initialization
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const details = await getProposalDetails(id as string);
        if (!details) {
          toast.error(t("proposalNotFound"));
          return;
        }

        // Format proposal data
        const formattedProposal: DetailedProposal = {
          id: id as string,
          name: details.tokenName,
          ticker: details.tokenSymbol,
          description: details.description,
          imageUrl: details.imageUrl,
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
          // Retry after delay if program not ready
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

  // Helper function to format large numbers
  const formatNumber = (number: number) => {
    return number.toLocaleString(locale === "fr" ? "fr-FR" : "en-US");
  };

  // Handle support form submission
  const handleSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposal || !supportAmount) return;

    try {
      setIsSubmitting(true);
      await supportProposal(
        proposal.publicKey.toString(),
        parseFloat(supportAmount)
      );
      toast.success(t("supportSuccess"));
      setSupportAmount("");
    } catch (error: any) {
      console.error("Support failed:", error);
      toast.error(error.message || t("supportError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper function to get status string
  const getStatusString = (status: any): ProposalStatus => {
    if (typeof status === "object") {
      // If status is an object, take the first key
      return Object.keys(status)[0] as ProposalStatus;
    }
    return status as ProposalStatus;
  };

  // Helper function to get status color
  const getStatusColor = (status: ProposalStatus) => {
    switch (status) {
      case "active":
        return "bg-blue-500 text-white";
      case "validated":
        return "bg-green-500 text-white";
      case "rejected":
        return "bg-red-500 text-white";
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
      </div>
    );
  }

  // Not found state
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
      <BackButton />

      <div className="bg-gray-900/50 p-3 md:p-6 rounded-lg border border-gray-800">
        {/* Header */}
        <div className="flex flex-col md:flex-row gap-8">
          {/* Image et Infos de Base */}
          <div className="flex-shrink-0">
            <div className="relative w-full md:w-64 h-64 bg-gray-800 rounded-lg overflow-hidden">
              {proposal.imageUrl && proposal.imageUrl.length > 0 ? (
                <Image
                  src={ipfsToHttp(proposal.imageUrl)}
                  alt={proposal.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
                    console.error("Image failed to load:", e);
                    const target = e.target as HTMLImageElement;
                    target.style.display = "none";
                  }}
                  priority // Pour charger l'image en priorité
                />
              ) : (
                <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">
                  {t("noImage")}
                </div>
              )}
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

              {/* Support Form */}
              {publicKey ? (
                getStatusString(proposal.status) !== "active" ? (
                  <p className="text-sm text-gray-400">
                    {t("proposalNotActive")}
                  </p>
                ) : (
                  <div className="w-full max-w-sm mt-4">
                    <form
                      onSubmit={handleSupport}
                      className="flex flex-col gap-3"
                    >
                      <div className="relative">
                        <input
                          type="number"
                          value={supportAmount}
                          onChange={(e) => setSupportAmount(e.target.value)}
                          min="0.001"
                          step="0.001"
                          required
                          placeholder="0.0"
                          className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          SOL
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">{t("minAmount")}</p>
                      <button
                        type="submit"
                        disabled={
                          isSubmitting ||
                          !supportAmount ||
                          parseFloat(supportAmount) < 0.001
                        }
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? t("supporting") : t("support")}
                      </button>
                    </form>
                  </div>
                )
              ) : (
                <button
                  onClick={() => {
                    /* add wallet connect action */
                  }}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                >
                  {t("connectToSupport")}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-4">{t("description")}</h2>
            <p className="text-gray-300 whitespace-pre-wrap">
              {proposal.description}
            </p>
          </div>

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
