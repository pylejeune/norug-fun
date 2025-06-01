"use client";

import { ActiveProposalsView } from "@/components/home/ActiveProposalsView";
import { SloganBanner } from "@/components/home/SloganBanner";
import {
  EpochState,
  ProposalState,
  useProgram,
} from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const t = useTranslations("Home");
  const { locale } = useParams();
  const { getAllEpochs, getProposalsByEpoch } = useProgram();

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
      if (!selectedEpochId) return;

      setLoading(true);
      try {
        const proposals = await getProposalsByEpoch(selectedEpochId);
        setAllProposals(proposals);
      } catch (error) {
        console.error("Failed to load proposals:", error);
        toast.error(t("errorLoadingProposals"));
      } finally {
        setLoading(false);
      }
    };

    loadProposals();
  }, [selectedEpochId, getProposalsByEpoch, t]);

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

  return (
    <>
      <SloganBanner />
      <div className="container mx-auto px-4 pb-8">
        <ActiveProposalsView
          selectedEpochId={selectedEpochId}
          selectedEpochDetails={selectedEpochDetails}
          filteredProposals={allProposals}
          loading={loading}
          locale={currentLocale}
          onSelectEpoch={setSelectedEpochId}
        />
      </div>
    </>
  );
}
