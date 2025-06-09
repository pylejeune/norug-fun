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
  const [isLoadingEpochs, setIsLoadingEpochs] = useState(true);

  // Auto-select epoch based on rules:
  // - If 1 active epoch: auto-select it
  // - If 2+ active epochs: select the latest created one
  // - If 0 active epochs: show message
  useEffect(() => {
    const initializeEpoch = async () => {
      setIsLoadingEpochs(true);
      try {
        const epochs = await getAllEpochs();
        const activeEpochs = epochs.filter((epoch) => "active" in epoch.status);

        if (activeEpochs.length === 1) {
          // Only one active epoch: auto-select it
          setSelectedEpochId(activeEpochs[0].epochId);
          console.log(
            "Auto-selected single active epoch:",
            activeEpochs[0].epochId
          );
        } else if (activeEpochs.length >= 2) {
          // Multiple active epochs: select the latest created (highest epochId)
          const latestEpoch = activeEpochs.reduce((latest, current) =>
            parseInt(current.epochId) > parseInt(latest.epochId)
              ? current
              : latest
          );
          setSelectedEpochId(latestEpoch.epochId);
          console.log(
            "Auto-selected latest active epoch:",
            latestEpoch.epochId
          );
        } else {
          // No active epochs
          setSelectedEpochId(undefined);
          console.log("No active epochs found");
        }
      } catch (error) {
        console.error("Failed to load epochs:", error);
        toast.error(t("errorLoadingEpochs"));
      } finally {
        setIsLoadingEpochs(false);
      }
    };

    initializeEpoch();
  }, [getAllEpochs, t]);

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
          isLoadingEpochs={isLoadingEpochs}
        />
      </div>
    </>
  );
}
