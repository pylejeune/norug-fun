"use client";

import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

// TODO: Move to types file
type TimeRange = "day" | "week" | "month" | "year" | "all";
type SortOrder = "asc" | "desc";

type FeeTransaction = {
  id: string;
  amount: number;
  timestamp: Date;
  type: "proposal" | "vote" | "other";
  description: string;
};

export default function TreasuryPage() {
  const t = useTranslations("Treasury");
  const { locale } = useParams();
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

  // TODO: Replace with real data from Solana program
  const [transactions] = useState<FeeTransaction[]>([
    {
      id: "tx_1",
      amount: 0.5,
      timestamp: new Date("2025-04-14T19:00:00"),
      type: "proposal",
      description: "Proposal creation fee - Project Alpha",
    },
    {
      id: "tx_2",
      amount: 0.1,
      timestamp: new Date("2025-04-14T19:05:25"),
      type: "vote",
      description: "Voting fee - Project Beta",
    },
    {
      id: "tx_3",
      amount: 0.5,
      timestamp: new Date("2025-04-14T19:10:00"),
      type: "proposal",
      description: "Proposal creation fee - Project Beta",
    },
  ]);

  // Filter and sort transactions
  const sortedTransactions = useMemo(() => {
    // First filter transactions
    const filtered = transactions.filter((tx: FeeTransaction) => {
      if (timeRange === "all") return true;

      const now = new Date();
      const msPerDay = 24 * 60 * 60 * 1000;
      const timeDiff = now.getTime() - tx.timestamp.getTime();

      switch (timeRange) {
        case "day":
          return timeDiff <= msPerDay;
        case "week":
          return timeDiff <= 7 * msPerDay;
        case "month":
          return timeDiff <= 30 * msPerDay;
        case "year":
          return timeDiff <= 365 * msPerDay;
        default:
          return true;
      }
    });

    // Then sort filtered transactions
    return filtered.sort((a: FeeTransaction, b: FeeTransaction) => {
      const sortValue = sortOrder === "desc" ? -1 : 1;
      return (b.timestamp.getTime() - a.timestamp.getTime()) * sortValue;
    });
  }, [transactions, timeRange, sortOrder]);

  // Calculate total fees
  const totalFees = useMemo(() => {
    return sortedTransactions.reduce(
      (sum: number, tx: FeeTransaction) => sum + tx.amount,
      0
    );
  }, [sortedTransactions]);

  // Format date with time
  const formatDateTime = (date: Date) => {
    return format(date, "PPpp", {
      locale: locale === "fr" ? fr : enUS,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6">
      {/* Treasury Overview */}
      <div className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold">{t("title")}</h1>
            <p className="text-sm text-gray-400">{t("description")}</p>
          </div>
          <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
            <select
              className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            >
              <option value="day">{t("timeRange.day")}</option>
              <option value="week">{t("timeRange.week")}</option>
              <option value="month">{t("timeRange.month")}</option>
              <option value="year">{t("timeRange.year")}</option>
              <option value="all">{t("timeRange.all")}</option>
            </select>
            <select
              className="w-full sm:w-auto bg-gray-800 border border-gray-700 rounded-md px-3 py-1.5 text-sm"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="desc">{t("sort.newest")}</option>
              <option value="asc">{t("sort.oldest")}</option>
            </select>
          </div>
        </div>

        <div className="mt-4 p-4 bg-gray-800/50 rounded-lg">
          <p className="text-lg md:text-xl font-semibold text-green-500">
            {t("totalFees", {
              amount: totalFees.toLocaleString(locale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            })}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="space-y-3">
        {sortedTransactions.map((tx) => (
          <div
            key={tx.id}
            className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800"
          >
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <p className="text-sm md:text-base">{tx.description}</p>
                <p className="text-xs text-gray-400">
                  {formatDateTime(tx.timestamp)}
                </p>
              </div>
              <p
                className={`text-base md:text-lg font-medium ${
                  tx.type === "proposal"
                    ? "text-blue-500"
                    : tx.type === "vote"
                      ? "text-purple-500"
                      : "text-gray-500"
                }`}
              >
                {t("amount", {
                  amount: tx.amount.toLocaleString(locale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
