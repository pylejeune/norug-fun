"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { ArrowLeftIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

type ProposalStatus = "active" | "rejected" | "validated";

type DetailedProposal = {
  id: string;
  name: string;
  ticker: string;
  description: string;
  image_url: string | null;
  epoch_id: string;
  created_at: Date;
  ended_at: Date;
  final_solana_raised: number;
  creator_address: string;
  is_user_proposal: boolean;
  is_user_supported: boolean;
  user_support_amount?: number;
  status: ProposalStatus;
  total_supply: number;
  creator_supply: number;
  supporters_supply: number;
  is_active: boolean;
  rank?: number;
  total_proposals: number;
};

export default function ProposalDetailPage() {
  const t = useTranslations("ProposalDetail");
  const { locale, id } = useParams();
  const { publicKey } = useWallet();
  const router = useRouter();
  const [supportAmount, setSupportAmount] = useState<string>("");

  // TODO: Fetch proposal details from Solana program
  const [proposal] = useState<DetailedProposal>({
    id: "token_1",
    name: "Project Alpha",
    ticker: "ALPHA",
    description: "A revolutionary DeFi protocol for sustainable yield farming",
    image_url: "/tokenDemo/alpha.png",
    epoch_id: "epoch_1",
    created_at: new Date("2025-04-14T19:00:00"),
    ended_at: new Date("2025-04-15T18:59:59"),
    final_solana_raised: 25.5,
    creator_address: "abc123...",
    is_user_proposal: false,
    is_user_supported: false,
    status: "active",
    is_active: true,
    total_supply: 1000000,
    creator_supply: 200000,
    supporters_supply: 800000,
    rank: 12,
    total_proposals: 25,
  });

  const formatDate = (date: Date) => {
    return format(date, "PPpp", {
      locale: locale === "fr" ? fr : enUS,
    });
  };

  // TODO: Implement support action
  const handleSupport = async (e: React.FormEvent) => {
    console.log("TODO: Support with", supportAmount, "SOL");
  };

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
            {proposal.image_url ? (
              <img
                src={proposal.image_url}
                alt={proposal.name}
                className="w-full aspect-square object-cover rounded-lg"
              />
            ) : (
              <div className="w-full aspect-square bg-gray-800 rounded-lg flex items-center justify-center text-gray-600">
                {t("noImage")}
              </div>
            )}
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
                  amount: proposal.final_solana_raised.toLocaleString(locale, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  }),
                })}
              </p>
              {proposal.is_user_supported && proposal.user_support_amount && (
                <p className="text-base text-blue-400">
                  {t("yourSupport", {
                    amount: proposal.user_support_amount.toLocaleString(
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
                className={`text-base font-medium ${
                  proposal.status === "validated"
                    ? "text-green-500"
                    : proposal.status === "active"
                    ? "text-blue-500"
                    : "text-red-500"
                }`}
              >
                {t(`status.${proposal.status}`)}
              </p>
            </div>

            {/* Support Form */}
            {!proposal.is_user_proposal && proposal.is_active && (
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
                {proposal.rank && proposal.rank > 10 && (
                  <p className="text-sm text-center lg:text-left text-gray-400">
                    {t("currentRank", {
                      rank: proposal.rank,
                      total: proposal.total_proposals,
                    })}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>

        {/* Details Sections */}
        <div className="mt-6 space-y-4">
          {/* Description */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h2 className="text-lg font-medium mb-2">{t("description")}</h2>
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
                <p className="text-lg">
                  {proposal.total_supply.toLocaleString()}
                </p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">
                  {t("creatorSupply")}
                </p>
                <p className="text-lg">
                  {proposal.creator_supply.toLocaleString()} (
                  {(
                    (proposal.creator_supply / proposal.total_supply) *
                    100
                  ).toFixed(1)}
                  %)
                </p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">
                  {t("supportersSupply")}
                </p>
                <p className="text-lg">
                  {proposal.supporters_supply.toLocaleString()} (
                  {(
                    (proposal.supporters_supply / proposal.total_supply) *
                    100
                  ).toFixed(1)}
                  %)
                </p>
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
                <p className="text-sm text-gray-400 mb-1">{t("createdAt")}</p>
                <p>{formatDate(proposal.created_at)}</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">{t("endDate")}</p>
                <p>{formatDate(proposal.ended_at)}</p>
              </div>
              <div className="bg-gray-900/50 p-3 rounded-lg">
                <p className="text-sm text-gray-400 mb-1">{t("creator")}</p>
                <p className="font-mono break-all">
                  {proposal.creator_address}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
