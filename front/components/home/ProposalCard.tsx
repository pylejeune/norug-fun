import { ProposalState } from "@/context/ProgramContext";
import { cn } from "@/lib/utils";
import { ipfsToHttp } from "@/utils/ImageStorage";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { formatDistanceToNow } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";

// --- Props type definition ---
type ProposalCardProps = {
  proposal: ProposalState;
  locale: string | undefined;
  className?: string; // Expects border classes (static or gradient)
};

export function ProposalCard({
  proposal,
  locale,
  className,
}: ProposalCardProps) {
  const t = useTranslations("Home");

  // --- Helper functions ---
  // Format relative date (e.g. "2 hours ago")
  const formatRelativeDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === "fr" ? fr : enUS,
    });
  };

  // --- Card Content Layout ---
  const CardContent = (
    <>
      {/* Left: Project Image */}
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

      {/* Center: Project Info */}
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

      {/* Right: Support Button and Stats */}
      <div className="flex items-center gap-4 ml-auto flex-shrink-0">
        {/* Support Button */}
        <Link
          href={`/${locale}/proposal/${proposal.publicKey.toString()}#support`}
          className={cn(
            "px-4 py-2",
            "bg-emerald-700",
            "text-white rounded-lg",
            "text-sm flex-shrink-0 whitespace-nowrap",
            "hover:bg-emerald-500",
            "hover:shadow-lg hover:shadow-emerald-500/50",
            "transition-all duration-200"
          )}
        >
          {t("supportProject")}
        </Link>
        {/* Stats Column */}
        <div className="flex flex-col items-end space-y-0.5">
          <span className="text-base font-semibold text-gray-100 whitespace-nowrap">
            {t("solanaRaised", {
              amount: (proposal.solRaised / LAMPORTS_PER_SOL).toFixed(2),
            })}
          </span>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {t("totalContributions", {
              count: proposal.totalContributions,
            })}
          </span>
        </div>
      </div>
    </>
  );

  // --- Card Border Styles ---
  const hasGradientBorder = className?.includes("gradient-border-");

  if (hasGradientBorder) {
    // Gradient border version
    return (
      <div
        className={cn(
          "gradient-border", // Base gradient effect class
          className, // Color class (e.g. "gradient-border-green")
          "bg-gray-800/50", // Card background
          "rounded-xl", // Border radius
          "flex items-center", // Layout
          "px-4 py-1" // Internal padding
        )}
      >
        <div className="relative z-10 flex items-center w-full">
          {CardContent}
        </div>
      </div>
    );
  } else {
    // Static border version
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
