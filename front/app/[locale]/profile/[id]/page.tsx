"use client";

import ProfileImage from "@/components/profile/ProfileImage";
import BackButton from "@/components/ui/BackButton";
import { ProposalState, useProgram } from "@/context/ProgramContext";
import { ipfsToHttp } from "@/utils/ImageStorage";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type SortOrder = "asc" | "desc";
type SortBy = "date" | "name" | "amount";
type ViewMode = "created_proposals" | "supported_tokens";
type ProposalStatusType = {
  active?: {};
  validated?: {};
  rejected?: {};
};

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

  const sortedProposals = useMemo(() => {
    if (!proposals) return [];

    return [...proposals].sort((a, b) => {
      const sortValue = sortOrder === "desc" ? -1 : 1;

      switch (sortBy) {
        case "name":
          return a.tokenName.localeCompare(b.tokenName) * sortValue;
        case "amount":
          return (b.solRaised - a.solRaised) * sortValue;
        default:
          return 0;
      }
    });
  }, [proposals, sortBy, sortOrder]);

  const formatSolAmount = (lamports: number) => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(2);
  };

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

      // Recharger les propositions
      const userPubKey = new PublicKey(id);
      const data = await getUserSupportedProposals(userPubKey);
      setProposals(data);
    } catch (error) {
      console.error("Failed to reclaim support:", error);
      toast.error(t("claimError"));
    }
  };

  const getStatusString = (status: ProposalStatusType): string => {
    if ("active" in status) return "active";
    if ("validated" in status) return "validated";
    if ("rejected" in status) return "rejected";
    return "unknown";
  };

  const handleCardClick = (proposalId: string) => {
    router.push(`/${locale}/proposal/${proposalId}`);
  };

  // Calcul pour la pagination
  const paginatedProposals = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return sortedProposals.slice(start, end);
  }, [sortedProposals, currentPage]);

  const totalPages = Math.ceil(sortedProposals.length / itemsPerPage);

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
        <div className="flex flex-wrap gap-2 mb-4">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="bg-gray-800 text-gray-300 px-3 py-2 rounded-lg border border-gray-700"
          >
            <option value="date">{t("sortBy.date")}</option>
            <option value="name">{t("sortBy.name")}</option>
            <option value="amount">{t("sortBy.amount")}</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-gray-800 text-gray-300 px-3 py-2 rounded-lg border border-gray-700 hover:bg-gray-700"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>

        {/* Proposals List */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
          </div>
        ) : sortedProposals.length === 0 ? (
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
                    "rejected" in proposal.status &&
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
                          Claim
                        </button>
                      </div>
                    )}
                </div>
              </div>
            ))}

            {/* Pagination controls */}
            {sortedProposals.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 text-sm">
                <div className="text-gray-400">
                  {t("pagination.showing", {
                    start: (currentPage - 1) * itemsPerPage + 1,
                    end: Math.min(
                      currentPage * itemsPerPage,
                      sortedProposals.length
                    ),
                    total: sortedProposals.length,
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
