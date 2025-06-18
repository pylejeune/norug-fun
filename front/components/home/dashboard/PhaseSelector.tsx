import { LiveIndicator } from "@/components/home/EpochCountdown";

type PhaseSelectorProps = {
  activePhase: "phase1" | "phase2";
  onPhaseChange: (phase: "phase1" | "phase2") => void;
  shouldShowLive: boolean;
  isExpired: boolean;
};

export function PhaseSelector({
  activePhase,
  onPhaseChange,
  shouldShowLive,
  isExpired,
}: PhaseSelectorProps) {
  return (
    <div className="flex gap-2 flex-shrink-0">
      <button
        className={`px-6 py-2 rounded-full font-bold transition-colors whitespace-nowrap flex items-center gap-2
          ${
            activePhase === "phase1"
              ? "bg-[#1e293b] text-[#e6d3ba] shadow"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }
        `}
        onClick={() => onPhaseChange("phase1")}
      >
        Phase 1{shouldShowLive && <LiveIndicator isExpired={isExpired} />}
      </button>
      <button
        className={`px-6 py-2 rounded-full font-bold transition-colors whitespace-nowrap
          ${
            activePhase === "phase2"
              ? "bg-[#1e293b] text-[#e6d3ba] shadow"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }
        `}
        onClick={() => onPhaseChange("phase2")}
      >
        Phase 2
      </button>
    </div>
  );
}
