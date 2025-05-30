"use client";

import { ActiveProposalsView } from "@/components/home/ActiveProposalsView";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
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

  const [selectedEpochId, setSelectedEpochId] = useState<string>();
  const [allProposals, setAllProposals] = useState<ProposalState[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEpochDetails, setSelectedEpochDetails] =
    useState<EpochState | null>(null);

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
        console.error("Failed to load epochs:", error);
        toast.error(t("errorLoadingEpochs"));
      }
    };

    if (!selectedEpochId) {
      initializeEpoch();
    }
  }, [getAllEpochs, selectedEpochId, t]);

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
  }, [getAllProposals, t]);

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

  // Prepare words for TypewriterEffect
  const sloganWords = [
    { text: "10" },
    { text: "tokens" },
    { text: "rise." },
    { text: "The" },
    { text: "rest" },
    { text: "burn.", className: "text-red-600 dark:text-red-500" },
    { text: "Choose" },
    { text: "your" },
    { text: "side." },
  ];

  return (
    <div className="container mx-auto px-4 pt-4 pb-8">
      {/* Slogan Section with Typewriter Effect */}
      <div className="text-center mb-6">
        <TypewriterEffect
          words={sloganWords}
          className="text-xl"
          cursorClassName="bg-white"
        />
      </div>

      <ActiveProposalsView
        selectedEpochId={selectedEpochId}
        selectedEpochDetails={selectedEpochDetails}
        filteredProposals={filteredProposals}
        loading={loading}
        locale={currentLocale}
        onSelectEpoch={setSelectedEpochId}
      />
    </div>
  );
}
