"use client";

import EpochSelector from "@/components/epoch/EpochSelector";
import {
  EpochState,
  ProposalState,
  useProgram,
} from "@/context/ProgramContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const t = useTranslations("Home");
  const { locale } = useParams();
  const { getAllProposals, getAllEpochs } = useProgram();

  const [viewMode, setViewMode] = useState<"active" | "previous">("active");
  const [selectedEpochId, setSelectedEpochId] = useState<string>();
  const [allProposals, setAllProposals] = useState<ProposalState[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEpochDetails, setSelectedEpochDetails] =
    useState<EpochState | null>(null);
  const [modeTransitioning, setModeTransitioning] = useState(false);

  // Load and select the first active epoch
  useEffect(() => {
    const initializeEpoch = async () => {
      try {
        const epochs = await getAllEpochs();
        const activeEpochs = epochs.filter((epoch) => "active" in epoch.status);
        if (activeEpochs.length > 0) {
          setSelectedEpochId(activeEpochs[0].epochId);
        }
      } catch (error) {
        console.error("Failed to fetch epochs:", error);
      }
    };

    if (!selectedEpochId) {
      initializeEpoch();
    }
  }, [getAllEpochs, selectedEpochId]);

  // Reload proposals when landing on the page
  useEffect(() => {
    const loadProposals = async () => {
      setLoading(true);
      try {
        const proposals = await getAllProposals();
        setAllProposals(proposals);
      } catch (error) {
        console.error("Failed to load proposals:", error);
        toast.error(t("errorLoadingProposals"));
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, [getAllProposals]);

  // Load epoch details when one is selected
  useEffect(() => {
    const loadEpochDetails = async () => {
      if (!selectedEpochId) return;
      try {
        const epochs = await getAllEpochs();
        const epoch = epochs.find((e) => e.epochId === selectedEpochId);
        if (epoch) {
          setSelectedEpochDetails(epoch);
        }
      } catch (error) {
        console.error("Failed to fetch epoch details:", error);
      }
    };

    loadEpochDetails();
  }, [selectedEpochId, getAllEpochs]);

  // Filter proposals by epoch
  const filteredProposals = useMemo(() => {
    if (!selectedEpochId) return [];
    return allProposals.filter((p) => p.epochId === selectedEpochId);
  }, [selectedEpochId, allProposals]);

  // Sort proposals by SOL amount raised
  const sortedProposals = useMemo(() => {
    return [...filteredProposals].sort((a, b) => b.solRaised - a.solRaised);
  }, [filteredProposals]);

  // Handle mode change effect
  useEffect(() => {
    const initializeEpoch = async () => {
      setModeTransitioning(true); // Start transition
      setAllProposals([]); // Reset proposals during transition
      setSelectedEpochDetails(null); // Reset epoch details

      try {
        const epochs = await getAllEpochs();
        const filteredEpochs =
          viewMode === "active"
            ? epochs.filter((epoch) => "active" in epoch.status)
            : epochs.filter((epoch) => "closed" in epoch.status);

        if (filteredEpochs.length > 0) {
          setSelectedEpochId(filteredEpochs[0].epochId);
        } else {
          setSelectedEpochId(undefined);
          setSelectedEpochDetails(null); // Ensure details are null if no epochs
        }

        // Reload proposals after epoch change
        const proposals = await getAllProposals();
        setAllProposals(proposals);
      } catch (error) {
        console.error("Failed to fetch epochs:", error);
        setSelectedEpochDetails(null); // Reset on error
      } finally {
        setModeTransitioning(false);
      }
    };

    initializeEpoch();
  }, [getAllEpochs, viewMode]);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Toggle Switch */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-800/50 p-1 rounded-full">
          <div className="relative flex">
            <button
              onClick={() => {
                setViewMode("active");
              }}
              className={`relative z-10 px-6 py-2 rounded-full transition-all duration-200 ${
                viewMode === "active"
                  ? "text-white font-medium"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {t("activeProposals")}
            </button>
            <button
              onClick={() => {
                setViewMode("previous");
              }}
              className={`relative z-10 px-6 py-2 rounded-full transition-all duration-200 ${
                viewMode === "previous"
                  ? "text-white font-medium"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {t("previousEpochs")}
            </button>
            <div
              className="absolute inset-y-0 w-1/2 bg-green-600/90 rounded-full transition-transform duration-200 shadow-lg"
              style={{
                transform: `translateX(${
                  viewMode === "previous" ? "100%" : "0"
                })`,
              }}
            />
          </div>
        </div>
      </div>

      {viewMode === "active" ? (
        <>
          <EpochSelector
            selectedEpochId={selectedEpochId}
            onSelect={setSelectedEpochId}
            activeOnly
          />
          {selectedEpochDetails && (
            <div className="mt-6 mb-8 p-6 bg-gray-800/50 rounded-xl border border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <h3 className="text-sm text-gray-400 mb-1">
                    {t("epochStart")}
                  </h3>
                  <p className="text-lg font-semibold">
                    {format(
                      new Date(selectedEpochDetails.startTime * 1000),
                      "PPp",
                      { locale: locale === "fr" ? fr : enUS }
                    )}
                  </p>
                </div>

                <div className="text-center">
                  <h3 className="text-sm text-gray-400 mb-1">
                    {t("epochEnd")}
                  </h3>
                  <p className="text-lg font-semibold">
                    {format(
                      new Date(selectedEpochDetails.endTime * 1000),
                      "PPp",
                      {
                        locale: locale === "fr" ? fr : enUS,
                      }
                    )}
                  </p>
                </div>

                <div className="text-center">
                  <h3 className="text-sm text-gray-400 mb-1">
                    {t("proposalsCount")}
                  </h3>
                  <p className="text-lg font-semibold">
                    {t("proposalCount", { count: filteredProposals.length })}
                  </p>
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
          ) : filteredProposals.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredProposals.map((proposal) => (
                <div
                  key={proposal.publicKey.toString()}
                  className="bg-gray-800/50 rounded-xl overflow-hidden border border-gray-700 
                    hover:border-gray-500 transition-all duration-200 shadow-lg hover:shadow-xl
                    transform hover:-translate-y-1"
                >
                  {/* Image placeholder - à remplacer par l'image réelle */}
                  <div className="h-48 bg-gray-700 animate-pulse"></div>

                  <div className="p-6 space-y-4">
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-gray-100">
                        {proposal.tokenName}
                      </h3>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-400">
                          ${proposal.tokenSymbol}
                        </p>
                        <p className="text-xs text-gray-500">
                          {t("by")} {proposal.creator.toString().slice(0, 4)}...
                          {proposal.creator.toString().slice(-4)}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-sm text-gray-300">
                      <span>
                        {t("solanaRaised", {
                          amount: (
                            proposal.solRaised / LAMPORTS_PER_SOL
                          ).toFixed(2),
                        })}
                      </span>
                      <span className="text-gray-400">
                        {t("totalContributions", {
                          count: proposal.totalContributions,
                        })}
                      </span>
                    </div>

                    <Link
                      href={`/${locale}/proposal/${proposal.publicKey.toString()}#support`}
                      className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-lg
                        hover:bg-green-700 transition-colors duration-200"
                    >
                      {t("supportProject")}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              {selectedEpochId
                ? t("noProposalsInEpoch")
                : t("selectEpochToViewProposals")}
            </div>
          )}
        </>
      ) : (
        <>
          <EpochSelector
            selectedEpochId={selectedEpochId}
            onSelect={setSelectedEpochId}
            completedOnly
          />
          {selectedEpochDetails && (
            <div className="mt-6 mb-8">
              <h2 className="text-xl font-bold mb-4">{t("topProposals")}</h2>
              <div className="space-y-4">
                {sortedProposals.map((proposal, index) => (
                  <div
                    key={proposal.publicKey.toString()}
                    className={`p-4 rounded-lg border ${
                      index < 10
                        ? "bg-green-900/20 border-green-600"
                        : "bg-gray-800/50 border-gray-700"
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold">{proposal.tokenName}</h3>
                        <p className="text-sm text-gray-400">
                          {t("rank", { rank: index + 1 })}
                          {index < 10 && (
                            <span className="ml-2 text-green-500">
                              {t("qualifiedForPhase2")}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          {(proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2)}{" "}
                          SOL
                        </p>
                        <p className="text-sm text-gray-400">
                          {t("contributions", {
                            count: proposal.totalContributions,
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
