"use client";

import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button"; // Assuming shadcn Button path
import { useParams } from "next/navigation"; // Import useParams to get locale
import { useTranslations } from "next-intl"; // Import useTranslations

// Basic structure with emphasis, Solana gradient subtitles, and localized CTAs
export default function HowItWorksPage() {
  const { locale } = useParams(); // Get the current locale
  const t = useTranslations("HowItWorksPage"); // Initialize translations for this page

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      {/* Header */}
      <div className="flex flex-col items-center mb-12 md:mb-16">
        <Image
          src="/images/noruglogo.png"
          alt="NoRug.fun Logo"
          width={100}
          height={100} // Adjust size as needed
          className="mb-4"
        />
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-2">
          {t("title")}
        </h1>
        <p className="text-center text-muted-foreground">{t("subtitle")}</p>
      </div>

      {/* Phase 1 */}
      <div className="mb-12 md:mb-16">
        <h2 className="text-2xl md:text-3xl font-semibold text-center mb-8">
          {t("phase1Title")}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="border p-6 rounded-lg shadow-sm flex flex-col">
            <h3
              className="text-xl font-semibold mb-4 text-center md:text-left 
                           bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text"
            >
              {t("founderCardTitle")}
            </h3>
            <div className="flex-grow">
              <p
                className="mb-3"
                dangerouslySetInnerHTML={{ __html: t.raw("founderCardP1") }}
              />
              <ul className="list-disc list-inside mb-3 space-y-1 text-muted-foreground">
                <li>{t("founderCardL1")}</li>
                <li>{t("founderCardL2")}</li>
              </ul>
              <p
                className="mb-3"
                dangerouslySetInnerHTML={{ __html: t.raw("founderCardP2") }}
              />
              <p
                className="font-medium"
                dangerouslySetInnerHTML={{ __html: t.raw("founderCardP3") }}
              />
              <p className="text-sm text-muted-foreground mt-2">
                {t("founderCardP4")}
              </p>
            </div>
            <div className="mt-6 text-center">
              <Link href={`/${locale}/create`} passHref>
                <Button
                  variant="outline"
                  className="cursor-pointer transition-all duration-300 hover:border-[#9945FF] hover:shadow-[0_0_10px_2px_rgba(153,69,255,0.5)]"
                >
                  {t("founderButton")}
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Column */}
          <div className="border p-6 rounded-lg shadow-sm flex flex-col">
            <h3
              className="text-xl font-semibold mb-4 text-center md:text-left 
                           bg-gradient-to-r from-[#9945FF] to-[#14F195] text-transparent bg-clip-text"
            >
              {t("coFounderCardTitle")}
            </h3>
            <div className="flex-grow">
              <p
                className="mb-3"
                dangerouslySetInnerHTML={{ __html: t.raw("coFounderCardP1") }}
              />
              <p
                className="mb-3 font-medium"
                dangerouslySetInnerHTML={{ __html: t.raw("coFounderCardP2") }}
              />
              <p
                className="mb-3 font-medium"
                dangerouslySetInnerHTML={{ __html: t.raw("coFounderCardP3") }}
              />
              <p
                className="italic text-center md:text-left"
                dangerouslySetInnerHTML={{ __html: t.raw("coFounderCardP4") }}
              />
            </div>
            <div className="mt-6 text-center">
              <Link href={`/${locale}`} passHref>
                <Button
                  variant="outline"
                  className="cursor-pointer transition-all duration-300 hover:border-[#9945FF] hover:shadow-[0_0_10px_2px_rgba(153,69,255,0.5)]"
                >
                  {t("coFounderButton")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Phase 2 */}
      <div className="text-center">
        <h2 className="text-2xl md:text-3xl font-semibold mb-6">
          {t("phase2Title")}
        </h2>
        <div className="max-w-3xl mx-auto">
          <p
            className="mb-4 text-lg"
            dangerouslySetInnerHTML={{ __html: t.raw("phase2P1") }}
          />
          <p
            className="mb-4 text-muted-foreground"
            dangerouslySetInnerHTML={{ __html: t.raw("phase2P2") }}
          />
          <p>{t("phase2P3")}</p>
        </div>
      </div>
    </div>
  );
}
