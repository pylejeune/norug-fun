"use client";

import ProposalSupportList from "@/components/proposal/ProposalSupportList";
import BackButton from "@/components/ui/BackButton";
import { ProposalSupport, useProgram } from "@/context/ProgramContext";
import { ipfsToHttp } from "@/utils/ImageStorage";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

type ProposalStatusType = {
  active?: {};
  validated?: {};
  rejected?: {};
};

export type DetailedProposal = {
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
  status: ProposalStatusType;
  totalContributions: number;
  lockupPeriod: number;
  publicKey: PublicKey;
  supporters: PublicKey[];
};

export default function ProposalDetailPage() {
  // 1. Hooks
  const t = useTranslations("ProposalDetail");
  const { locale, id } = useParams();
  const { publicKey } = useWallet();
  const {
    getProposalDetails,
    supportProposal,
    getProposalSupports,
    reclaimSupport,
  } = useProgram();

  // 2. States
  const [supportAmount, setSupportAmount] = useState<string>("");
  const [proposal, setProposal] = useState<DetailedProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supports, setSupports] = useState<ProposalSupport[]>([]);
  const [isLoadingSupports, setIsLoadingSupports] = useState(true);
  const [isCurrentUser, setIsCurrentUser] = useState(false);

  // 3. Callbacks
  const loadProposal = useCallback(async () => {
    if (!id || !getProposalDetails) return;

    try {
      setLoading(true);
      const details = await getProposalDetails(id as string);

      if (!details) {
        toast.error(t("proposalNotFound"));
        return;
      }

      setProposal({
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
        status: details.status as unknown as ProposalStatusType,
        totalContributions: details.totalContributions,
        lockupPeriod: details.lockupPeriod,
        publicKey: details.publicKey,
        supporters: details.supporters,
      });
    } catch (error) {
      toast.error(t("errorLoadingProposal"));
    } finally {
      setLoading(false);
    }
  }, [id, getProposalDetails, t]);

  const loadSupports = useCallback(async () => {
    if (!proposal?.publicKey || !getProposalSupports) return;

    try {
      setIsLoadingSupports(true);
      const proposalSupports = await getProposalSupports(
        proposal.publicKey.toString()
      );
      setSupports(proposalSupports);
    } catch (error) {
      toast.error(t("errorLoadingSupports"));
    } finally {
      setIsLoadingSupports(false);
    }
  }, [proposal?.publicKey, getProposalSupports, t]);

  const handleSupport = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!proposal || !supportAmount || !supportProposal) return;

      try {
        setIsSubmitting(true);
        await supportProposal(
          proposal.publicKey.toString(),
          parseFloat(supportAmount)
        );
        toast.success(t("supportSuccess"));
        setSupportAmount("");
        loadSupports();
      } catch (error: any) {
        toast.error(error.message || t("supportError"));
      } finally {
        setIsSubmitting(false);
      }
    },
    [proposal, supportAmount, supportProposal, t, loadSupports]
  );

  const handleReclaimSupport = async () => {
    if (!publicKey || !proposal) return;

    try {
      await reclaimSupport(proposal.publicKey, parseInt(proposal.epoch_id));
      toast.success(t("claimSuccess"));
      await loadProposal();
    } catch (error) {
      console.error("Failed to reclaim support:", error);
      toast.error(t("claimError"));
    }
  };

  // 4. Effects
  useEffect(() => {
    loadProposal();
  }, [loadProposal]);

  useEffect(() => {
    if (proposal) {
      loadSupports();
    }
  }, [proposal, loadSupports]);

  useEffect(() => {
    if (!publicKey) return;
    setIsCurrentUser(publicKey.toBase58() === id);
  }, [publicKey, id]);

  // 5. Render helpers
  const formatNumber = useCallback(
    (number: number) => {
      return number.toLocaleString(locale === "fr" ? "fr-FR" : "en-US");
    },
    [locale]
  );

  // Helper function to get status string
  const getStatusString = (status: any): string => {
    if ("active" in status) return "active";
    if ("validated" in status) return "validated";
    if ("rejected" in status) return "rejected";
    return "unknown";
  };

  // Helper function to get status color
  const getStatusColor = (status: ProposalStatusType) => {
    if ("active" in status) return "bg-blue-500 text-white";
    if ("validated" in status) return "bg-green-500 text-white";
    if ("rejected" in status) return "bg-red-500 text-white";
    return "bg-gray-500 text-white";
  };

  const isFullyLoaded = !loading && !isLoadingSupports && proposal && supports;

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
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
          {/* Image and Basic Info */}
          <div className="flex-shrink-0">
            <div className="relative w-full md:w-64 h-64 bg-gray-800 rounded-lg overflow-hidden">
              {proposal.imageUrl && proposal.imageUrl.length > 0 ? (
                <Image
                  src={ipfsToHttp(proposal.imageUrl)}
                  alt={proposal.name}
                  fill
                  className="object-cover"
                  onError={(e) => {
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
              {isFullyLoaded ? (
                <>
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
                    "active" in proposal.status ? (
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
                          <p className="text-xs text-gray-400">
                            {t("minAmount")}
                          </p>
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
                    ) : (
                      "rejected" in proposal.status &&
                      supports.some(
                        (support) =>
                          support.user.toBase58() === publicKey.toBase58() &&
                          support.amount > 0
                      ) && (
                        <button
                          onClick={handleReclaimSupport}
                          disabled={loading}
                          className="w-full px-6 py-3 rounded-lg font-medium 
                                  bg-red-900/50 hover:bg-red-900 text-red-100 
                                  transition-colors hover:bg-opacity-80"
                        >
                          {t("claimButton")}
                        </button>
                      )
                    )
                  ) : (
                    "active" in proposal.status && (
                      <button
                        onClick={() => {}}
                        className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors"
                      >
                        {t("connectToSupport")}
                      </button>
                    )
                  )}
                </>
              ) : (
                <div className="w-full flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
                </div>
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
                <Link
                  href={`/${locale}/profile/${proposal.creator.toString()}`}
                  className="font-mono break-all hover:underline hover:text-[#e6d3ba] transition-colors"
                >
                  {proposal.creator.toString()}
                </Link>
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

          {/* Supporters Section */}
          <ProposalSupportList proposal={proposal} />
        </div>
      </div>
    </div>
  );
}
