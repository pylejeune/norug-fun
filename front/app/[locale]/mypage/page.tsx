"use client";

import { useProgram } from "@/context/ProgramContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

// TODO: Move to types file
type SortOrder = "asc" | "desc";
type SortBy = "date" | "name" | "votes";
type ViewMode = "my_proposals" | "supported_tokens";

export default function MyPage() {
  const t = useTranslations("MyPage");
  const { locale } = useParams();
  const { publicKey } = useWallet();
  const { getUserProposals, getUserSupportedProposals } = useProgram();
  const [viewMode, setViewMode] = useState<ViewMode>("my_proposals");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState(true);
  const [proposals, setProposals] = useState<any[]>([]);

  // Load proposals
  useEffect(() => {
    const loadProposals = async () => {
      if (!publicKey) return;

      setLoading(true);
      try {
        const data =
          viewMode === "my_proposals"
            ? await getUserProposals(publicKey)
            : await getUserSupportedProposals(publicKey);
        setProposals(data);
      } catch (error) {
        console.error("Failed to load proposals:", error);
        toast.error(t("errorLoadingProposals"));
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, [publicKey, viewMode, getUserProposals, getUserSupportedProposals]);

  // Sort proposals
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      const sortValue = sortOrder === "desc" ? -1 : 1;

      switch (sortBy) {
        case "date":
          return (
            (new Date(b.endTime).getTime() - new Date(a.endTime).getTime()) *
            sortValue
          );
        case "name":
          return a.tokenName.localeCompare(b.tokenName) * sortValue;
        case "votes":
          return (b.solRaised - a.solRaised) * sortValue;
        default:
          return 0;
      }
    });
  }, [proposals, sortBy, sortOrder]);

  // Format date
  const formatDate = (timestamp: number) => {
    if (!timestamp) return "N/A";

    try {
      return format(new Date(timestamp * 1000), "PPpp", {
        locale: locale === "fr" ? fr : enUS,
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  // Helper function to extract status
  const getStatusString = (status: any): string => {
    if (typeof status === "object") {
      // If status is an object, take the first key
      return Object.keys(status)[0];
    }
    return status;
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6">
      {/* Header with view toggle */}
      <div className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800">
        <h1 className="text-xl md:text-2xl font-bold mb-4">{t("title")}</h1>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* View Toggle */}
          <div className="flex w-full sm:w-auto rounded-lg border border-gray-700 p-0.5 bg-gray-800/50">
            <button
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "my_proposals"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              onClick={() => setViewMode("my_proposals")}
            >
              {t("viewMode.myProposals")}
            </button>
            <button
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === "supported_tokens"
                  ? "bg-gray-700 text-white"
                  : "text-gray-400 hover:text-white hover:bg-gray-700/50"
              }`}
              onClick={() => setViewMode("supported_tokens")}
            >
              {t("viewMode.supportedTokens")}
            </button>
          </div>

          {/* Sort Controls */}
          <div className="flex gap-2 w-full sm:w-auto">
            <select
              className="flex-1 sm:flex-none bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="date">{t("sort.byDate")}</option>
              <option value="name">{t("sort.byName")}</option>
              <option value="votes">{t("sort.byVotes")}</option>
            </select>
            <select
              className="flex-1 sm:flex-none bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="desc">{t("sort.desc")}</option>
              <option value="asc">{t("sort.asc")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : !publicKey ? (
        <div className="text-center py-8 text-gray-400">
          {t("connectWallet")}
        </div>
      ) : sortedProposals.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {viewMode === "my_proposals"
            ? t("noProposals")
            : t("noSupportedTokens")}
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {sortedProposals.map((proposal) => (
            <div
              key={proposal.publicKey.toString()}
              className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800 hover:bg-gray-900/70 transition-colors"
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Image */}
                <div className="w-full sm:w-32 h-32 flex-shrink-0">
                  {proposal.image_url ? (
                    <img
                      src={proposal.image_url}
                      alt={proposal.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">
                      {t("noImage")}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <h3 className="text-lg font-medium truncate">
                        {proposal.tokenName}
                      </h3>
                      <p className="text-sm font-mono text-gray-400">
                        ${proposal.tokenSymbol}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col items-start sm:items-end gap-1">
                      <p className="text-lg font-medium text-green-500">
                        {(proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2)} SOL
                      </p>
                      {proposal.userSupportAmount && (
                        <p className="text-sm text-blue-400">
                          {t("yourSupport", {
                            amount: proposal.userSupportAmount.toFixed(2),
                          })}
                        </p>
                      )}
                      <p
                        className={`text-sm font-medium ${
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
                  </div>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span className="bg-gray-800/50 px-2 py-1 rounded">
                      {t("epochId")}: {proposal.epochId}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
