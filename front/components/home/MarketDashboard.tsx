"use client";

import { ProposalFilters } from "@/components/ui/ProposalFilters";
import { EpochState } from "@/context/ProgramContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { useEpochCountdown } from "@/hooks/useEpochCountdown";
import { useEffect, useState } from "react";

import { Phase1Content } from "./dashboard/Phase1Content";
import { Phase2Content } from "./dashboard/Phase2Content";
import { PhaseSelector } from "./dashboard/PhaseSelector";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type MarketDashboardProps = {
  selectedEpochId?: string;
  selectedEpochDetails: EpochState | null;
  locale: string | undefined;
  isLoadingEpochs: boolean;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketDashboard({
  selectedEpochId,
  selectedEpochDetails,
  locale,
  isLoadingEpochs,
}: MarketDashboardProps) {
  const { isExpired } = useEpochCountdown(selectedEpochDetails?.endTime);
  const [activePhase, setActivePhase] = useState<"phase1" | "phase2">("phase1");
  const isMobile = useIsMobile();

  // Shared filter states for both phases
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [showFilters, setShowFilters] = useState(false);

  // Only show live indicator if we have epoch details and it's not expired
  const shouldShowLive = Boolean(
    selectedEpochDetails && !isExpired && !isLoadingEpochs
  );

  // Force grid view on mobile
  useEffect(() => {
    if (isMobile && viewMode !== "grid") setViewMode("grid");
  }, [isMobile, viewMode]);

  // Handler for opening filters
  const openFilters = () => setShowFilters(true);

  return (
    <div className="pt-2">
      {/* Header Section - Phase Selector and Controls */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Phase Selector */}
        <PhaseSelector
          activePhase={activePhase}
          onPhaseChange={setActivePhase}
          shouldShowLive={shouldShowLive}
          isExpired={isExpired}
        />

        {/* Control Bar - Shown for both phases */}
        <div className="w-full sm:w-auto mt-2 sm:mt-0">
          <ProposalFilters
            search={search}
            onSearchChange={setSearch}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onOpenFilters={openFilters}
            showViewModeToggle={true}
          />
        </div>
      </div>

      {/* Phase Content */}
      {activePhase === "phase1" ? (
        <Phase1Content
          selectedEpochId={selectedEpochId}
          selectedEpochDetails={selectedEpochDetails}
          locale={locale}
          isLoadingEpochs={isLoadingEpochs}
          search={search}
          viewMode={viewMode}
          showFilters={showFilters}
          onShowFiltersChange={setShowFilters}
        />
      ) : (
        <Phase2Content
          locale={locale}
          search={search}
          viewMode={viewMode}
          showFilters={showFilters}
          onShowFiltersChange={setShowFilters}
        />
      )}
    </div>
  );
}
