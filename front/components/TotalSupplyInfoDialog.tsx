"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import { useTranslations } from "next-intl"
import { useState, useEffect } from "react"

// Helper pour formater les grands nombres pour l'affichage (ex: 1M, 100k)
const formatDisplayNumber = (num: number): string => {
  if (num >= 1_000_000_000) return `${num / 1_000_000_000}B`;
  if (num >= 1_000_000) return `${num / 1_000_000}M`;
  if (num >= 1_000) return `${num / 1_000}k`;
  return num.toString();
};

// Helper pour formater le prix
const formatPrice = (price: number) => {
  if (price < 0.000001 && price > 0) return "< $0.000001";
  if (price === 0) return "$0.00";
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 8 }).format(price);
};

const totalSupplyOptions = [
  { value: 1_000_000, label: "1M" },
  { value: 10_000_000, label: "10M" },
  { value: 100_000_000, label: "100M" },
  { value: 500_000_000, label: "500M" },
  { value: 1_000_000_000, label: "1B" },
  { value: 10_000_000_000, label: "10B" },
  { value: 100_000_000_000, label: "100B" },
];

const marketCapOptions = [
  { value: 10_000, label: "$10k" },
  { value: 50_000, label: "$50k" },
  { value: 100_000, label: "$100k" },
  { value: 500_000, label: "$500k" },
  { value: 1_000_000, label: "$1M" },
  { value: 5_000_000, label: "$5M" },
  { value: 10_000_000, label: "$10M" },
  { value: 25_000_000, label: "$25M" },
  { value: 50_000_000, label: "$50M" },
  { value: 100_000_000, label: "$100M" },
  { value: 300_000_000, label: "$300M" },
];

export function TotalSupplyInfoDialog({ children }: { children: React.ReactNode }) {
  const t = useTranslations("ProposalForm.totalSupplyInfo");

  // États pour les VALEURS sélectionnées
  const [currentTotalSupply, setCurrentTotalSupply] = useState<number>(totalSupplyOptions[2].value); // Default 100M
  const [currentMarketCap, setCurrentMarketCap] = useState<number>(marketCapOptions[4].value); // Default $1M
  const [estimatedPrice, setEstimatedPrice] = useState("");

  // Trouver l'index actuel pour les sliders
  const totalSupplySliderIndex = totalSupplyOptions.findIndex(opt => opt.value === currentTotalSupply);
  const marketCapSliderIndex = marketCapOptions.findIndex(opt => opt.value === currentMarketCap);

  useEffect(() => {
    if (currentTotalSupply > 0) {
      const price = currentMarketCap / currentTotalSupply;
      setEstimatedPrice(formatPrice(price));
    } else {
      setEstimatedPrice(t("invalidSupplyForPrice"));
    }
  }, [currentTotalSupply, currentMarketCap, t]);

  const handleTotalSupplyChange = (sliderValue: number[]) => {
    setCurrentTotalSupply(totalSupplyOptions[sliderValue[0]].value);
  };

  const handleMarketCapChange = (sliderValue: number[]) => {
    setCurrentMarketCap(marketCapOptions[sliderValue[0]].value);
  };

  return (
    <Dialog>
      {children} 
      <DialogContent className="sm:max-w-lg md:max-w-xl bg-white dark:bg-neutral-900 opacity-100">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription className="mb-4 space-y-2">
            <p>{t("descriptionPart1")}</p>
            <p>
              <strong>{t("formula")}</strong>
            </p>
            <p>
              {t.rich("descriptionPart2Interactive", {
                underline: (chunks) => <u>{chunks}</u>,
              })}
            </p>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Slider pour Total Supply (basé sur l'index) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="totalSupplySlider" className="text-sm font-medium">{t("totalSupplyLabel")}</Label>
              <span className="text-sm font-semibold text-primary">{totalSupplyOptions[totalSupplySliderIndex]?.label || "N/A"}</span>
            </div>
            <Slider
              id="totalSupplySlider"
              min={0}
              max={totalSupplyOptions.length - 1}
              step={1}
              value={[totalSupplySliderIndex]}
              onValueChange={handleTotalSupplyChange}
            />
            <p className="text-xs text-muted-foreground mt-1 pt-1">{t("pumpFunReference")}</p>
          </div>

          {/* Slider pour Market Cap Cible (basé sur l'index) */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <Label htmlFor="marketCapSlider" className="text-sm font-medium">{t("marketCapLabel")}</Label>
              <span className="text-sm font-semibold text-primary">{marketCapOptions[marketCapSliderIndex]?.label || "N/A"}</span>
            </div>
            <Slider
              id="marketCapSlider"
              min={0}
              max={marketCapOptions.length - 1}
              step={1}
              value={[marketCapSliderIndex]}
              onValueChange={handleMarketCapChange}
            />
          </div>

          {/* Prix Estimé */}
          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">{t("estimatedPriceLabel")}</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-500">{estimatedPrice}</p>
          </div>
        </div>

        {/* Section pour informations contextuelles */}
        <div className="mt-6 pt-4 border-t">
          <h4 className="text-md font-semibold mb-2">{t("marketCapStagesTitle")}</h4>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>{t("marketCapStageLaunch")}</li> 
            <li>{t("marketCapStageSuccess")}</li>
            <li>{t("marketCapStageHugeSuccess")}</li>
          </ul>
           <p className="text-xs text-muted-foreground mt-2">{t("marketCapDisclaimer")}</p>
        </div>

      </DialogContent>
    </Dialog>
  );
} 