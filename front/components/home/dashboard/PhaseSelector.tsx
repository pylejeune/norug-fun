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
    <div className="relative flex bg-gray-900/50 backdrop-blur-sm rounded-full p-1 border border-gray-700/50 flex-shrink-0 w-full sm:w-auto">
      {/* Sliding background indicator */}
      <div
        className={`absolute top-1 bottom-1 bg-gradient-to-r from-[#e6d3ba] to-[#d6c3a0] rounded-full shadow-xl transition-all duration-500 ease-out ${
          activePhase === "phase1"
            ? "left-1 right-1/2 mr-0.5"
            : "left-1/2 right-1 ml-0.5"
        }`}
      />

      {/* Phase 1 Button */}
      <button
        className={`relative z-10 flex-1 sm:flex-none py-2 rounded-full font-bold transition-all duration-300 whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 text-sm sm:text-base ${
          shouldShowLive && activePhase === "phase1"
            ? "px-3 sm:px-7"
            : "px-4 sm:px-6"
        } ${
          activePhase === "phase1"
            ? "text-[#1e293b] shadow-sm"
            : "text-gray-300 hover:text-[#e6d3ba] sm:hover:scale-105"
        }`}
        onClick={() => onPhaseChange("phase1")}
      >
        Phase 1
        {shouldShowLive && activePhase === "phase1" && (
          <LiveIndicator className="ml-2" isExpired={isExpired} />
        )}
      </button>

      {/* Phase 2 Button */}
      <button
        className={`relative z-10 flex-1 sm:flex-none sm:px-6 px-4 py-2 rounded-full font-bold transition-all duration-300 whitespace-nowrap flex items-center justify-center text-sm sm:text-base ${
          activePhase === "phase2"
            ? "text-[#1e293b] shadow-sm"
            : "text-gray-300 hover:text-[#e6d3ba] sm:hover:scale-105"
        }`}
        onClick={() => onPhaseChange("phase2")}
      >
        Phase 2
      </button>
    </div>
  );
}
