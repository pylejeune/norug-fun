"use client";

import { EpochState, useProgram } from "@/context/ProgramContext";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type EpochSelectorProps = {
  selectedEpochId?: string;
  onSelect: (epochId: string) => void;
  activeOnly?: boolean;
  completedOnly?: boolean;
};

export default function EpochSelector({
  onSelect,
  selectedEpochId,
  activeOnly,
  completedOnly,
}: EpochSelectorProps) {
  const t = useTranslations("EpochSelector");
  const { getAllEpochs } = useProgram();
  const [epochs, setEpochs] = useState<EpochState[]>([]);
  const [loading, setLoading] = useState(true);
  const { locale } = useParams();

  useEffect(() => {
    const fetchEpochs = async () => {
      try {
        const allEpochs = await getAllEpochs();
        let filteredEpochs = allEpochs;

        if (activeOnly) {
          filteredEpochs = allEpochs.filter(
            (epoch) => "active" in epoch.status
          );
        } else if (completedOnly) {
          filteredEpochs = allEpochs.filter(
            (epoch) => "closed" in epoch.status
          );
        }

        setEpochs(filteredEpochs);
      } catch (error) {
        console.error("Failed to fetch epochs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEpochs();
  }, [getAllEpochs, activeOnly, completedOnly]);

  if (loading) {
    return <div className="text-gray-400">{t("loading")}</div>;
  }

  return (
    <div className="mb-4 transition-all duration-200">
      <label className="block text-sm font-medium mb-2 text-gray-200">
        {t("selectEpoch")}
      </label>
      <select
        className="w-full p-2 rounded bg-gray-800 border border-gray-700 text-gray-200 
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
          hover:border-gray-600 transition-colors"
        value={selectedEpochId}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" className="bg-gray-800 text-gray-400">
          {t("selectPlaceholder")}
        </option>
        {epochs.map((epoch) => (
          <option
            key={epoch.epochId}
            value={epoch.epochId}
            className="bg-gray-800 text-gray-200"
          >
            {t("epochOption", {
              id: epoch.epochId,
              startDate: format(new Date(epoch.startTime * 1000), "PP", {
                locale: locale === "fr" ? fr : enUS,
              }),
              endDate: format(new Date(epoch.endTime * 1000), "PP", {
                locale: locale === "fr" ? fr : enUS,
              }),
            })}
          </option>
        ))}
      </select>
    </div>
  );
}
