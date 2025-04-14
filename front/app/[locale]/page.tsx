"use client";

import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

// TODO: Move to types file
type Proposal = {
  id: string;
  name: string;
  ticker: string;
  description: string;
  image_url: string | null;
  epoch_id: string;
  created_at: Date;
  solana_raised: number;
};

export default function Home() {
  const t = useTranslations("Home");
  const { locale } = useParams();

  // TODO: Replace with real data from Solana program
  const currentEpoch = {
    id: "epoch_1",
    start_time: new Date("2025-04-14T19:00:00"),
    end_time: new Date("2025-04-15T18:59:59"),
    status: "active" as const,
  };

  // Add sort type state
  const [sortBy, setSortBy] = useState<"solana" | "name" | "date">("solana");

  const [proposals, setProposals] = useState<Proposal[]>([
    {
      id: "prop_1",
      name: "Project Alpha",
      ticker: "ALPHA",
      description:
        "A revolutionary DeFi protocol for sustainable yield farming",
      image_url: "/tokenDemo/alpha.png", // Updated path
      epoch_id: "epoch_1",
      created_at: new Date("2025-04-14T19:00:00"),
      solana_raised: 25.5,
    },
    {
      id: "prop_2",
      name: "Project Beta",
      ticker: "BETA",
      description: "Next-gen NFT marketplace with zero fees",
      image_url: "/tokenDemo/beta.png", // Updated path
      epoch_id: "epoch_1",
      created_at: new Date("2025-04-14T19:05:25"),
      solana_raised: 31.25,
    },
  ]);

  // Sort proposals based on selected criteria
  const sortedProposals = useMemo(() => {
    return [...proposals].sort((a, b) => {
      switch (sortBy) {
        case "solana":
          return b.solana_raised - a.solana_raised;
        case "name":
          return a.name.localeCompare(b.name);
        case "date":
          return b.created_at.getTime() - a.created_at.getTime();
        default:
          return 0;
      }
    });
  }, [proposals, sortBy]);

  // Format remaining time
  const formatTimeLeft = (endTime: Date) => {
    return formatDistanceToNow(endTime, {
      locale: locale === "fr" ? fr : enUS,
      addSuffix: true,
    });
  };

  // Format date with time
  const formatDate = (date: Date) => {
    return format(date, "PPpp", {
      locale: locale === "fr" ? fr : enUS,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6">
      {/* Current Epoch Status */}
      <div className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800">
        <h2 className="text-lg md:text-xl font-semibold mb-2 md:mb-3">
          {t("currentEpoch")}
        </h2>
        <div className="space-y-1 md:space-y-2">
          <p className="text-sm md:text-base">
            {t("timeLeft")}: {formatTimeLeft(currentEpoch.end_time)}
          </p>
          <p className="text-sm md:text-base">
            {t("proposalCount", { count: proposals.length })}
          </p>
        </div>
      </div>

      {/* Proposals List */}
      <div>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 md:mb-4">
          <h2 className="text-lg md:text-xl font-semibold">
            {t("proposalsList")}
          </h2>
          <select
            className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          >
            <option value="solana">{t("sortBySolana")}</option>
            <option value="name">{t("sortByName")}</option>
            <option value="date">{t("sortByDate")}</option>
          </select>
        </div>

        <div className="space-y-3 md:space-y-4">
          {sortedProposals.map((proposal) => (
            <div
              key={proposal.id}
              className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800 hover:border-gray-600 transition-colors"
            >
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                {/* Image */}
                <div className="w-full sm:w-24 h-40 sm:h-24 md:w-32 md:h-32 flex-shrink-0">
                  {proposal.image_url ? (
                    <img
                      src={proposal.image_url}
                      alt={proposal.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-800 rounded-lg flex items-center justify-center text-gray-600 text-sm">
                      {t("noImage")}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 mb-2">
                    <div className="w-full sm:w-auto">
                      <h3 className="text-base md:text-lg font-medium truncate">
                        {proposal.name}
                      </h3>
                      <p className="text-sm font-mono text-gray-400">
                        ${proposal.ticker}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto text-left sm:text-right">
                      <p className="text-base md:text-lg font-medium text-green-500">
                        {t("solanaRaised", {
                          amount: proposal.solana_raised.toLocaleString(
                            locale,
                            {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            }
                          ),
                        })}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDate(proposal.created_at)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm md:text-base text-gray-300 line-clamp-2 mb-2">
                    {proposal.description}
                  </p>
                  <p className="text-xs text-gray-400">
                    {t("epochId")}: {proposal.epoch_id}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
