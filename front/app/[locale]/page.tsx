"use client";

import { ProposalsList } from "@/components/home/ProposalsList";
import { SloganBanner } from "@/components/home/SloganBanner";
import { EpochState, useProgram } from "@/context/ProgramContext";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const { getAllEpochs } = useProgram();
  const [selectedEpochId, setSelectedEpochId] = useState<string>();
  const [selectedEpochDetails, setSelectedEpochDetails] =
    useState<EpochState | null>(null);

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

  // Update epoch details when ID changes
  useEffect(() => {
    const loadEpochDetails = async () => {
      if (!selectedEpochId) {
        setSelectedEpochDetails(null);
        return;
      }

      try {
        const epochs = await getAllEpochs();
        const epoch = epochs.find((e) => e.epochId === selectedEpochId);
        if (epoch) {
          setSelectedEpochDetails(epoch);
        }
      } catch (error) {
        console.error("Failed to fetch epoch details:", error);
        toast.error(t("errorLoadingEpochDetails"));
      }
    };

    loadEpochDetails();
  }, [selectedEpochId, getAllEpochs, t]);

  return (
    <>
      <SloganBanner />
      <div className="container mx-auto px-4 pb-8">
        <ProposalsList
          selectedEpochId={selectedEpochId}
          selectedEpochDetails={selectedEpochDetails}
          locale={locale}
          onSelectEpoch={setSelectedEpochId}
        />
      </div>
    </>
  );
}
