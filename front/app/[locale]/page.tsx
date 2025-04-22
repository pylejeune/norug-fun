"use client";

import { ActiveProposalsView } from "@/components/home/ActiveProposalsView";
import { PreviousEpochsView } from "@/components/home/PreviousEpochsView";
import { ViewModeToggle } from "@/components/home/ViewModeToggle";

import {
  EpochState,
  ProposalState,
  useProgram,
} from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
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

  // Convertir le locale en string
  const currentLocale = Array.isArray(locale) ? locale[0] : locale;

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
        <ViewModeToggle viewMode={viewMode} onChangeMode={setViewMode} />
      </div>

      {viewMode === "active" ? (
        <ActiveProposalsView
          selectedEpochId={selectedEpochId}
          selectedEpochDetails={selectedEpochDetails}
          filteredProposals={filteredProposals}
          loading={loading}
          locale={currentLocale}
          onSelectEpoch={setSelectedEpochId}
        />
      ) : (
        <PreviousEpochsView
          selectedEpochId={selectedEpochId}
          selectedEpochDetails={selectedEpochDetails}
          sortedProposals={sortedProposals}
          onSelectEpoch={setSelectedEpochId}
          locale={currentLocale}
        />
      )}
    </div>
  );
}
