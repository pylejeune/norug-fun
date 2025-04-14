"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

// TODO: Move to types file
type SortOrder = "asc" | "desc";
type SortBy = "date" | "name" | "votes";
type ViewMode = "my_proposals" | "supported_tokens";

type ArchivedToken = {
  id: string;
  name: string;
  ticker: string;
  description: string;
  image_url: string | null;
  epoch_id: string;
  created_at: Date;
  ended_at: Date;
  votes: number;
  final_solana_raised: number;
  creator_address: string;
  is_user_proposal: boolean;
  is_user_supported: boolean;
  user_support_amount?: number;
  status: "rejected" | "validated";
  required_amount: number;
};

export default function ArchivePage() {
  const t = useTranslations("Archive");
  const { locale } = useParams();
  const { publicKey } = useWallet();
  const [viewMode, setViewMode] = useState<ViewMode>("my_proposals");
  const [sortBy, setSortBy] = useState<SortBy>("date");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // TODO: Replace with real data from Solana program
  const [tokens] = useState<ArchivedToken[]>([
    {
      id: "token_1",
      name: "Project Alpha",
      ticker: "ALPHA",
      description:
        "A revolutionary DeFi protocol for sustainable yield farming",
      image_url: "/tokenDemo/alpha.png",
      epoch_id: "epoch_1",
      created_at: new Date("2025-04-14T19:00:00"),
      ended_at: new Date("2025-04-15T18:59:59"),
      votes: 150,
      final_solana_raised: 25.5,
      creator_address: "abc123...",
      is_user_proposal: true,
      is_user_supported: false,
      status: "rejected",
      required_amount: 100,
    },
    {
      id: "token_2",
      name: "Project Beta",
      ticker: "BETA",
      description: "Next-gen NFT marketplace with zero fees",
      image_url: "/tokenDemo/beta.png",
      epoch_id: "epoch_1",
      created_at: new Date("2025-04-14T19:05:25"),
      ended_at: new Date("2025-04-15T18:59:59"),
      votes: 120,
      final_solana_raised: 150.25,
      creator_address: "def456...",
      is_user_proposal: false,
      is_user_supported: true,
      user_support_amount: 5.5,
      status: "validated",
      required_amount: 100,
    },
  ]);

  // Filter and sort tokens
  const displayedTokens = useMemo(() => {
    // Filter based on view mode
    const filtered = tokens.filter((token) => {
      if (!publicKey) return false;
      return viewMode === "my_proposals"
        ? token.is_user_proposal
        : token.is_user_supported;
    });

    // Sort filtered tokens
    return filtered.sort((a, b) => {
      const sortValue = sortOrder === "desc" ? -1 : 1;

      switch (sortBy) {
        case "date":
          return (b.ended_at.getTime() - a.ended_at.getTime()) * sortValue;
        case "name":
          return a.name.localeCompare(b.name) * sortValue;
        case "votes":
          return (b.final_solana_raised - a.final_solana_raised) * sortValue;
        default:
          return 0;
      }
    });
  }, [tokens, sortBy, sortOrder, viewMode, publicKey]);

  // Format date
  const formatDate = (date: Date) => {
    return format(date, "PPpp", {
      locale: locale === "fr" ? fr : enUS,
    });
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
      {!publicKey ? (
        <div className="text-center py-8 text-gray-400">
          {t("connectWallet")}
        </div>
      ) : displayedTokens.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {viewMode === "my_proposals"
            ? t("noProposals")
            : t("noSupportedTokens")}
        </div>
      ) : (
        <div className="grid gap-3 md:gap-4">
          {displayedTokens.map((token) => (
            <div
              key={token.id}
              className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800 hover:bg-gray-900/70 transition-colors"
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Image */}
                <div className="w-full sm:w-32 h-32 flex-shrink-0">
                  {token.image_url ? (
                    <img
                      src={token.image_url}
                      alt={token.name}
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
                        {token.name}
                      </h3>
                      <p className="text-sm font-mono text-gray-400">
                        ${token.ticker}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto flex flex-col items-start sm:items-end gap-1">
                      <p className="text-lg font-medium text-green-500">
                        {t("solanaRaised", {
                          amount: token.final_solana_raised.toLocaleString(
                            locale,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          ),
                        })}
                      </p>
                      {token.is_user_supported && token.user_support_amount && (
                        <p className="text-sm text-blue-400">
                          {t("yourSupport", {
                            amount: token.user_support_amount.toLocaleString(
                              locale,
                              {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }
                            ),
                          })}
                        </p>
                      )}
                      <p
                        className={`text-sm font-medium ${
                          token.status === "validated"
                            ? "text-green-500"
                            : "text-red-500"
                        }`}
                      >
                        {t(`status.${token.status}`)}
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 line-clamp-2">
                    {token.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span className="bg-gray-800/50 px-2 py-1 rounded">
                      {t("epochId")}: {token.epoch_id}
                    </span>
                    <span className="bg-gray-800/50 px-2 py-1 rounded">
                      {t("endDate")}: {formatDate(token.ended_at)}
                    </span>
                    <span className="bg-gray-800/50 px-2 py-1 rounded">
                      {t("requiredAmount", {
                        amount: token.required_amount.toLocaleString(locale, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        }),
                      })}
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
