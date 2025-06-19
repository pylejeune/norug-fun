"use client";

import { MarketDashboard } from "@/components/home/MarketDashboard";
import { SloganBanner } from "@/components/home/SloganBanner";
import { EpochState } from "@/context/ProgramContext";
import { useEpochs } from "@/hooks/useSWRHooks";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Home() {
  const t = useTranslations("Home");
  const locale = useLocale();
  const { epochs, isLoading: isLoadingEpochs, isError } = useEpochs();
  const [selectedEpochId, setSelectedEpochId] = useState<string>();
  const [selectedEpochDetails, setSelectedEpochDetails] =
    useState<EpochState | null>(null);

  // Auto-select epoch based on rules:
  // - If 1 active epoch: auto-select it
  // - If 2+ active epochs: select the latest created one
  // - If 0 active epochs: show message
  const activeEpochs = useMemo(() => {
    return epochs.filter((epoch) => "active" in epoch.status);
  }, [epochs]);

  useEffect(() => {
    if (isLoadingEpochs || isError) return;

    if (activeEpochs.length === 1) {
      // Only one active epoch: auto-select it
      const epochId = activeEpochs[0].epochId;
      setSelectedEpochId(epochId);
      console.log("Auto-selected single active epoch:", epochId);
    } else if (activeEpochs.length >= 2) {
      // Multiple active epochs: select the latest created (highest epochId)
      const latestEpoch = activeEpochs.reduce((latest, current) =>
        parseInt(current.epochId) > parseInt(latest.epochId) ? current : latest
      );
      setSelectedEpochId(latestEpoch.epochId);
      console.log("Auto-selected latest active epoch:", latestEpoch.epochId);
    } else {
      // No active epochs
      setSelectedEpochId(undefined);
      console.log("No active epochs found");
    }
  }, [activeEpochs, isLoadingEpochs, isError]);

  // Update epoch details when ID changes
  useEffect(() => {
    if (!selectedEpochId || isLoadingEpochs) {
      setSelectedEpochDetails(null);
      return;
    }

    const epoch = epochs.find((e) => e.epochId === selectedEpochId);
    if (epoch) {
      setSelectedEpochDetails(epoch);
    } else {
      setSelectedEpochDetails(null);
    }
  }, [selectedEpochId, epochs, isLoadingEpochs]);

  // Show error toast if there's an error loading epochs
  useEffect(() => {
    if (isError) {
      toast.error(t("errorLoadingEpochs"));
    }
  }, [isError, t]);

  return (
    <>
      <SloganBanner />
      <div className="container mx-auto px-4 pb-8">
        <MarketDashboard
          selectedEpochId={selectedEpochId}
          selectedEpochDetails={selectedEpochDetails}
          locale={locale}
          isLoadingEpochs={isLoadingEpochs}
        />
      </div>
    </>
  );
}
