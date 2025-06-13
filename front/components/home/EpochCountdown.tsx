import { useEpochCountdown } from "@/hooks/useEpochCountdown";
import { Clock } from "lucide-react";
import { useTranslations } from "next-intl";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface EpochCountdownProps {
  endTimestamp?: number;
  className?: string;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function EpochCountdown({
  endTimestamp,
  className = "",
}: EpochCountdownProps) {
  const t = useTranslations("Home");
  const { days, hours, minutes, seconds, isExpired } =
    useEpochCountdown(endTimestamp);

  // Don't render if no timestamp provided
  if (!endTimestamp) {
    return null;
  }

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const formatTimeUnit = (value: number, unit: string) => {
    return (
      <div className="flex flex-col items-center">
        <span className="text-lg font-bold text-[#e6d3ba]">
          {value.toString().padStart(2, "0")}
        </span>
        <span className="text-xs text-gray-400 uppercase">{unit}</span>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 bg-gray-800/50 rounded-xl border border-gray-700 ${className}`}
    >
      {/* Clock Icon */}
      <div className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-[#e6d3ba]" />
        <span className="text-sm font-medium text-gray-300">
          {isExpired ? t("epochEnded") : t("timeRemaining")}
        </span>
      </div>

      {/* Countdown Display */}
      {!isExpired ? (
        <div className="flex items-center gap-2 ml-auto">
          {days > 0 && (
            <>
              {formatTimeUnit(days, t("days"))}
              <span className="text-gray-500 mx-1">:</span>
            </>
          )}
          {formatTimeUnit(hours, t("hours"))}
          <span className="text-gray-500 mx-1">:</span>
          {formatTimeUnit(minutes, t("minutes"))}
          <span className="text-gray-500 mx-1">:</span>
          {formatTimeUnit(seconds, t("seconds"))}
        </div>
      ) : (
        <div className="ml-auto">
          <span className="text-red-400 font-medium">{t("expired")}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// LIVE INDICATOR COMPONENT
// ============================================================================

export function LiveIndicator({
  className = "",
  isExpired = false,
}: {
  className?: string;
  isExpired?: boolean;
}) {
  // Don't render if epoch is expired
  if (isExpired) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Pulsing dot */}
      <div className="relative">
        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
        <div className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75"></div>
      </div>
      <span className="text-xs font-medium text-green-400 uppercase tracking-wide">
        Live
      </span>
    </div>
  );
}
