"use client";

import { ProposalCard } from "@/components/home/ProposalCard";
import { ProposalState } from "@/context/ProgramContext";
import { useIsMobile } from "@/hooks/use-mobile";

type ProposalGridProps = {
  proposals: ProposalState[];
  locale: string | undefined;
  viewMode: "list" | "grid";
};

export function ProposalGrid({
  proposals,
  locale,
  viewMode,
}: ProposalGridProps) {
  const isMobile = useIsMobile();

  // Generate border class for proposal ranking
  const getBorderClass = (index: number) => {
    if (index < 3) {
      return "gradient-border gradient-border-green";
    } else if (index < 7) {
      return "gradient-border gradient-border-blue";
    } else {
      return "border-1 border-gray-700";
    }
  };

  if (proposals.length === 0) {
    return null;
  }

  // List View (Desktop only)
  if (viewMode === "list" && !isMobile) {
    return (
      <div className="flex flex-col gap-4">
        {proposals.map((proposal, index) => (
          <ProposalCard
            key={proposal.publicKey.toString()}
            proposal={proposal}
            locale={locale}
            className={getBorderClass(index)}
            viewMode={viewMode}
          />
        ))}
      </div>
    );
  }

  // Grid View (Default and Mobile)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {proposals.map((proposal, index) => (
        <ProposalCard
          key={proposal.publicKey.toString()}
          proposal={proposal}
          locale={locale}
          className={getBorderClass(index)}
          viewMode="grid" // Force grid mode for grid layout
        />
      ))}
    </div>
  );
}
