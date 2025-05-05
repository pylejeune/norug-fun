import { ProposalState } from "@/context/ProgramContext";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { cn } from "@/lib/utils";

type ProposalCardProps = {
  proposal: ProposalState;
  locale: string | undefined;
  className?: string; // Expects border classes (static or gradient)
};

export function ProposalCard({ proposal, locale, className }: ProposalCardProps) {
  const t = useTranslations("Home");

  // Card content definition remains the same
  const CardContent = (
    <>
      <div className="w-12 h-12 bg-gray-700 rounded-lg mr-4 flex-shrink-0 animate-pulse"></div>
      <div className="flex-grow mr-4 space-y-1">
        <p className="font-bold text-lg text-gray-100">${proposal.tokenSymbol}</p>
        <h3 className="text-md text-gray-200">{proposal.tokenName}</h3>
        <p className="text-xs text-gray-500 pt-1">
          {t("by")} {proposal.creator.toString().slice(0, 4)}...
          {proposal.creator.toString().slice(-4)}
        </p>
      </div>
      {/* Section Droite : Réorganisée en Ligne (Bouton à gauche, Stats à droite) */}
      <div className="flex items-center gap-4 ml-auto flex-shrink-0">
        {/* Bouton Support (maintenant à gauche dans cette section) */}
        <Link
          href={`/${locale || "en"}/proposal/${proposal.publicKey.toString()}#support`}
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
        {/* Colonne interne pour les stats (SOL levés et Contributions) */}
        <div className="flex flex-col items-end space-y-0.5"> {/* Espace vertical réduit */}
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

  // Check if the passed className includes 'gradient-border-'
  const hasGradientBorder = className?.includes("gradient-border-");

  if (hasGradientBorder) {
    // Structure simple : un seul div avec .gradient-border, la couleur, le fond, le layout, le padding interne
    return (
      <div
        className={cn(
          "gradient-border", // Classe CSS de base pour l'effet
          className,         // Classe de couleur (ex: "gradient-border-green")
          "bg-gray-800/50",  // Fond réel de la carte
          "rounded-xl",      // Applique le radius (sera hérité par ::before)
          "flex items-center", // Layout du contenu
          "px-4 py-1"        // Padding INTERNE global réduit (py-2 -> py-1)
          // Le CSS .gradient-border::before ajoutera le padding EXTERNE pour la bordure
        )}
      >
        {/* Le contenu est directement enfant. Le z-index du ::before devrait le placer derrière ce contenu */}
        <div className="relative z-10 flex items-center w-full"> {/* Ajout d'un wrapper pour z-index */} 
          {CardContent} 
        </div>
      </div>
    );
  } else {
    // Structure pour bordure statique (padding global réduit aussi)
    return (
      <div
        className={cn(
          "flex items-center bg-gray-800/50 px-4 py-1 rounded-xl", // Padding global réduit (py-2 -> py-1)
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
