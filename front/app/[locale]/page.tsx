"use client";

import { format, formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import Link from "next/link";
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
      id: "token_1",
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

        <div className="grid gap-3 md:gap-4">
          {sortedProposals.map((proposal) => (
            <Link
              key={proposal.id}
              href={`/${locale}/proposal/${proposal.id}`}
              className="block bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800 hover:bg-gray-900/70 transition-colors"
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
                      <h3 className="text-lg font-medium truncate group-hover:text-blue-400">
                        {proposal.name}
                      </h3>
                      <p className="text-sm font-mono text-gray-400">
                        ${proposal.ticker}
                      </p>
                    </div>
                    <div className="w-full sm:w-auto text-left sm:text-right">
                      <p className="text-lg font-medium text-green-500">
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
                    </div>
                  </div>

                  <p className="text-sm text-gray-300 line-clamp-2">
                    {proposal.description}
                  </p>

                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span className="bg-gray-800/50 px-2 py-1 rounded">
                      {t("epochId")}: {proposal.epoch_id}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
