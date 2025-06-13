import { ProposalState } from "@/context/ProgramContext";
import { cn } from "@/lib/utils";
import { ipfsToHttp } from "@/utils/ImageStorage";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProposalCardProps = {
  proposal: ProposalState;
  locale: string | undefined;
  className?: string; // Expects border classes (static or gradient)
  viewMode?: "list" | "grid";
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProposalCard({
  proposal,
  locale,
  className,
  viewMode = "list",
}: ProposalCardProps) {
  const t = useTranslations("Home");

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  // Format relative date (e.g. "2 hours ago")
  const formatRelativeDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "fr" ? fr : enUS,
    });
  };

  // ============================================================================
  // SHARED CARD CONTENT (used in list view)
  // ============================================================================

  const CardContent = (
    <>
      {/* Project Image */}
      <div className="relative w-24 h-24 bg-gray-800 rounded-lg overflow-hidden">
        {proposal.imageUrl && proposal.imageUrl.length > 0 ? (
          <Image
            src={ipfsToHttp(proposal.imageUrl)}
            alt={proposal.tokenName}
            fill
            sizes="(max-width: 96px) 100vw, 96px"
            priority={true}
            className="object-cover"
            onError={(e) => {
              console.error("Image failed to load:", e);
              const target = e.target as HTMLImageElement;
              target.style.display = "none";
            }}
            onLoad={() => console.log("Image loaded successfully")}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            {t("noImage")}
          </div>
        )}
      </div>

      {/* Project Information */}
      <div className="flex-grow mr-4 space-y-1 ml-2">
        <p className="font-bold text-lg text-gray-100">
          ${proposal.tokenSymbol}
        </p>
        <h3 className="text-md text-gray-200">{proposal.tokenName}</h3>
        <div className="space-y-0.5">
          <p className="text-xs text-gray-500">
            {t("by")}{" "}
            <Link
              href={`/${locale}/profile/${proposal.creator.toString()}`}
              className="hover:underline hover:text-[#e6d3ba] transition-colors"
            >
              {proposal.creator.toString().slice(0, 4)}...
              {proposal.creator.toString().slice(-4)}
            </Link>
          </p>
          <p className="text-xs text-gray-500">
            {t("createdAgo", {
              time: formatRelativeDate(proposal.creationTimestamp),
            })}
          </p>
        </div>
      </div>

      {/* Stats and Support Button */}
      <div className="flex flex-col sm:flex-row gap-4 ml-auto flex-shrink-0 min-w-[200px]">
        <div className="flex flex-col items-end space-y-0.5 w-full">
          {/* SOL Raised */}
          <span className="text-base w-full text-center sm:w-32 font-semibold text-gray-100 whitespace-nowrap">
            {t("solanaRaised", {
              amount: (proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2),
            })}
          </span>
          {/* Total Contributions */}
          <span className="text-xs w-full text-center sm:w-32 text-gray-400 whitespace-nowrap">
            {t("totalContributions", {
              count: proposal.totalContributions,
            })}
          </span>
          {/* Support Button */}
          <Link
            href={`/${locale}/proposal/${proposal.publicKey.toString()}#support`}
            aria-label={t("supportProject")}
            className={cn(
              "px-4 py-2 mt-2 cursor-pointer relative z-10",
              "bg-emerald-700",
              "text-white rounded-lg",
              "text-sm whitespace-nowrap",
              "hover:bg-emerald-500",
              "hover:shadow-lg hover:shadow-emerald-500/50",
              "transition-all duration-200",
              "w-full text-center sm:w-32",
              "pointer-events-auto"
            )}
          >
            {t("supportProject")}
          </Link>
        </div>
      </div>
    </>
  );

  // Grid/Card View
  if (viewMode === "grid") {
    return (
      <div
        className={cn(
          "bg-gray-800/50 rounded-xl overflow-hidden flex flex-col shadow-md hover:shadow-lg transition-all duration-200 hover:-translate-y-1 border border-gray-700",
          className
        )}
      >
        {/* Top Image Section */}
        <div className="relative w-full h-40 bg-gray-900">
          {proposal.imageUrl && proposal.imageUrl.length > 0 ? (
            <Image
              src={ipfsToHttp(proposal.imageUrl)}
              alt={proposal.tokenName}
              fill
              sizes="(max-width: 100%) 100vw, 320px"
              priority={true}
              className="object-cover rounded-t-xl"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">
              {t("noImage")}
            </div>
          )}
        </div>

        {/* Card Content Section */}
        <div className="flex flex-col flex-1 p-4 gap-2">
          {/* Token Symbol */}
          <p className="font-bold text-lg text-gray-100">
            ${proposal.tokenSymbol}
          </p>
          {/* Token Name */}
          <h3 className="text-md text-gray-200">{proposal.tokenName}</h3>

          {/* Creator and Date Info */}
          <div className="space-y-0.5">
            <p className="text-xs text-gray-500">
              {t("by")}{" "}
              <Link
                href={`/${locale}/profile/${proposal.creator.toString()}`}
                className="hover:underline hover:text-[#e6d3ba] transition-colors"
              >
                {proposal.creator.toString().slice(0, 4)}...
                {proposal.creator.toString().slice(-4)}
              </Link>
            </p>
            <p className="text-xs text-gray-500">
              {t("createdAgo", {
                time: formatRelativeDate(proposal.creationTimestamp),
              })}
            </p>
          </div>

          {/* Stats and Action Section */}
          <div className="flex flex-col gap-1 mt-2">
            {/* SOL Raised */}
            <span className="text-base font-semibold text-gray-100 whitespace-nowrap">
              {t("solanaRaised", {
                amount: (proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2),
              })}
            </span>
            {/* Total Contributions */}
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {t("totalContributions", { count: proposal.totalContributions })}
            </span>
            {/* Support Button */}
            <Link
              href={`/${locale}/proposal/${proposal.publicKey.toString()}#support`}
              aria-label={t("supportProject")}
              className={cn(
                "px-4 py-2 mt-2 cursor-pointer relative z-10",
                "bg-emerald-700 text-white rounded-lg",
                "text-sm whitespace-nowrap",
                "hover:bg-emerald-500",
                "hover:shadow-lg hover:shadow-emerald-500/50",
                "transition-all duration-200",
                "w-full text-center",
                "pointer-events-auto"
              )}
            >
              {t("supportProject")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // List View
  else {
    return (
      <div
        className={cn(
          "flex items-center bg-gray-800/50 px-4 py-1 rounded-xl",
          className ? className : "border border-gray-700",
          "hover:border-gray-500 transition-all duration-200 shadow-md hover:shadow-lg",
          "transform hover:-translate-y-1"
        )}
      >
        {CardContent}
      </div>
    );
  }
}
