"use client";

import { EpochState, useProgram } from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export default function EpochSelector({
  onSelect,
  selectedEpochId,
}: {
  onSelect: (epochId: string) => void;
  selectedEpochId?: string;
}) {
  const t = useTranslations("EpochSelector");
  const { getAllEpochs } = useProgram();
  const [epochs, setEpochs] = useState<EpochState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEpochs = async () => {
      try {
        const allEpochs = await getAllEpochs();
        const activeEpochs = allEpochs.filter(
          (epoch) => "active" in epoch.status
        );
        setEpochs(activeEpochs);
      } catch (error) {
        console.error("Failed to fetch epochs:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEpochs();
  }, [getAllEpochs]);

  if (loading) {
    return <div className="text-gray-400">{t("loading")}</div>;
  }

  return (
    <div className="mb-4">
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
            {t("epochOption", { id: epoch.epochId })}
          </option>
        ))}
      </select>
    </div>
  );
}
