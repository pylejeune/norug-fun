"use client";

import ProfileImage from "@/components/profile/ProfileImage";
import BackButton from "@/components/ui/BackButton";
import { ProposalState, useProgram } from "@/context/ProgramContext";
import { ipfsToHttp } from "@/utils/ImageStorage";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SortOrder = "asc" | "desc";
type SortBy = "date" | "name" | "amount";
type ViewMode = "created_proposals" | "supported_tokens";
type ProposalStatusType = "active" | "validated" | "rejected";

export default function ProfilePage() {
  const t = useTranslations("Profile");
  const { locale, id } = useParams();
  const { publicKey } = useWallet();
  const { getUserProposals, getUserSupportedProposals, reclaimSupport } =
    useProgram();
  const [viewMode, setViewMode] = useState<ViewMode>("created_proposals");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<any[]>([]);
  const [isCurrentUser, setIsCurrentUser] = useState(false);
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const userAddress = Array.isArray(id) ? id[0] : id;

  useEffect(() => {
    if (!publicKey) return;
    setIsCurrentUser(publicKey.toBase58() === id);
  }, [publicKey, id]);

  useEffect(() => {
    const loadProposals = async () => {
      if (!id) return;

      try {
        const userPubKey = new PublicKey(id);
        setLoading(true);
        const data =
          viewMode === "created_proposals"
            ? await getUserProposals(userPubKey)
            : await getUserSupportedProposals(userPubKey);
        setProposals(data);
      } catch (error) {
        console.error("Failed to load proposals:", error);
        toast.error(t("errorLoadingProposals"));
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, [id, viewMode, getUserProposals, getUserSupportedProposals, t]);

  const sortProposals = useCallback(
    (proposals: ProposalState[]) => {
      let sorted = [...proposals];

      switch (sortBy) {
        case "date":
          sorted = sorted.sort((a, b) => {
            const comparison = a.creationTimestamp - b.creationTimestamp;
            return sortOrder === "desc" ? -comparison : comparison;
          });
          break;
        case "name":
          sorted = sorted.sort((a, b) => {
            const comparison = a.tokenName.localeCompare(b.tokenName);
            return sortOrder === "desc" ? -comparison : comparison;
          });
          break;
        case "amount":
          sorted = sorted.sort((a, b) => {
            const comparison = a.solRaised - b.solRaised;
            return sortOrder === "desc" ? -comparison : comparison;
          });
          break;
      }
      return sorted;
    },
    [sortBy, sortOrder]
  );

  const handleCopyAddress = async () => {
    if (!userAddress) return;
    try {
      await navigator.clipboard.writeText(userAddress);
      toast.success(t("addressCopied"));
    } catch (err) {
      console.error("Failed to copy address:", err);
      toast.error(t("copyFailed"));
    }
  };

  const handleReclaimSupport = async (proposal: ProposalState) => {
    if (!publicKey || !id) return;

    try {
      await reclaimSupport(proposal.publicKey, parseInt(proposal.epochId));
      toast.success(t("claimSuccess"));

      const userPubKey = new PublicKey(id);
      const data = await getUserSupportedProposals(userPubKey);
      setProposals(data);
    } catch (error) {
      console.error("Failed to reclaim support:", error);
      toast.error(t("claimError"));
    }
  };

  const getStatusString = (status: any): ProposalStatusType => {
    if ("active" in status) return "active";
    if ("validated" in status) return "validated";
    if ("rejected" in status) return "rejected";
    return "active"; // fallback
  };

  const handleCardClick = (proposalId: string) => {
    router.push(`/${locale}/proposal/${proposalId}`);
  };

  // Pagination calculation
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortProposals(proposals).slice(start, end);
  }, [proposals, currentPage, sortProposals]);

  const totalPages = Math.ceil(sortProposals(proposals).length / itemsPerPage);

  // Format relative date (e.g. "2 hours ago")
  const formatRelativeDate = (timestamp: number, locale: string) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "fr" ? fr : enUS,
    });
  };

  // Format full date (e.g. "April 1, 2024 at 14:30")
  const formatFullDate = (timestamp: number, locale: string) => {
    const date = new Date(timestamp * 1000);
    return format(
      date,
      locale === "fr" ? "d MMMM yyyy 'à' HH:mm" : "MMMM d, yyyy 'at' HH:mm",
      { locale: locale === "fr" ? fr : enUS }
    );
  };

  if (!id) {
    return (
      <div className="text-center py-8 text-gray-400">
        {t("invalidAddress")}
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6">
      {/* Back Button */}
      <BackButton />

      {/* Profile Info */}
      <div className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800">
        <div className="flex items-center gap-6 mb-4">
          <ProfileImage size={96} />
          <div>
            <h1 className="text-xl md:text-2xl font-bold mb-2">
              {userAddress?.slice(0, 6)}
            </h1>
            <div className="flex items-center gap-3">
              <button
                onClick={handleCopyAddress}
                className="flex items-center gap-2 font-mono text-gray-400 hover:text-gray-300 transition-colors"
              >
                <Copy size={14} />
                <span>
                  {userAddress?.slice(0, 4)}...{userAddress?.slice(-4)}
                </span>
              </button>
              <Link
                href={`https://solscan.io/account/${userAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                {t("viewOnSolscan")}
              </Link>
            </div>
          </div>
        </div>

        {/* View Mode Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setViewMode("created_proposals")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === "created_proposals"
                ? "bg-[#213a0e] text-[#e6d3ba]"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t("createdTokens")}
          </button>
          <button
            onClick={() => setViewMode("supported_tokens")}
            className={`px-4 py-2 rounded-lg transition-colors ${
              viewMode === "supported_tokens"
                ? "bg-[#213a0e] text-[#e6d3ba]"
                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
            }`}
          >
            {t("supportedTokens")}
          </button>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-4 mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-gray-800 text-white rounded-lg px-3 py-2"
          >
            <option value="date">{t("sortBy.date")}</option>
            <option value="name">{t("sortBy.name")}</option>
            <option value="amount">{t("sortBy.amount")}</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            className="bg-gray-800 text-white rounded-lg px-3 py-2"
          >
            <option value="desc">{t("sortBy.newest")}</option>
            <option value="asc">{t("sortBy.oldest")}</option>
          </select>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : sortProposals(proposals).length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            {viewMode === "created_proposals"
              ? t("noCreatedTokens")
              : t("noSupportedTokens")}
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedProposals.map((proposal) => (
              <div
                key={proposal.publicKey.toString()}
                onClick={() => handleCardClick(proposal.publicKey.toString())}
                className="block bg-gray-800/50 p-3 rounded-lg hover:bg-gray-800 
                          transition-colors cursor-pointer overflow-hidden relative"
              >
                <div className="flex items-center gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 flex-shrink-0 bg-gray-700 rounded-lg overflow-hidden relative">
                    {proposal.imageUrl ? (
                      <Image
                        src={ipfsToHttp(proposal.imageUrl)}
                        alt={proposal.tokenName}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-500 text-sm">
                        {t("noImage")}
                      </div>
                    )}
                  </div>

                  {/* Contenu principal */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-base truncate">
                      {proposal.tokenName}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>${proposal.tokenSymbol}</span>
                      <span>•</span>
                      <span>#{proposal.epochId}</span>
                      <span>•</span>
                      <span
                        className={`
                          ${
                            getStatusString(proposal.status) === "active"
                              ? "text-green-500"
                              : ""
                          }
                          ${
                            getStatusString(proposal.status) === "validated"
                              ? "text-blue-500"
                              : ""
                          }
                          ${
                            getStatusString(proposal.status) === "rejected"
                              ? "text-red-500"
                              : ""
                          }
                        `}
                      >
                        {t(
                          `proposalStatus.${getStatusString(proposal.status)}`
                        )}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1 flex flex-col">
                      <span>
                        {formatRelativeDate(
                          proposal.creationTimestamp,
                          locale as string
                        )}
                      </span>
                      <span className="text-xs opacity-75">
                        {formatFullDate(
                          proposal.creationTimestamp,
                          locale as string
                        )}
                      </span>
                    </div>
                    {viewMode === "supported_tokens" && (
                      <div className="text-sm text-gray-500 mt-1">
                        {(proposal.solRaised / LAMPORTS_PER_SOL).toLocaleString(
                          locale as string,
                          {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          }
                        )}{" "}
                        SOL
                      </div>
                    )}
                  </div>

                  {/* Bouton Claim */}
                  {viewMode === "supported_tokens" &&
                    getStatusString(proposal.status) === "rejected" &&
                    isCurrentUser && (
                      <div className="flex-shrink-0 flex items-center">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            handleReclaimSupport(proposal);
                          }}
                          className="px-3 py-1.5 sm:px-5 sm:py-2.5 bg-red-900/50 hover:bg-red-900 
                                    text-red-100 text-sm sm:text-base rounded-lg transition-colors 
                                    font-medium hover:bg-opacity-80"
                        >
                          {t("claimButton")}
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}

            {/* Pagination controls */}
            {sortProposals(proposals).length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm">
                <div className="text-gray-400">
                  {t("pagination.showing", {
                    start: (currentPage - 1) * itemsPerPage + 1,
                    end: Math.min(
                      currentPage * itemsPerPage,
                      sortProposals(proposals).length
                    ),
                    total: sortProposals(proposals).length,
                  })}
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
          </div>
        )}
      </div>
    </div>
  );
}
