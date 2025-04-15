"use client";

import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useState } from "react";

// TODO: Move types to shared types file
type EpochStatus = "active" | "pending" | "ended";
type Epoch = {
  epoch_id: string;
  start_time: Date;
  end_time: Date | null;
  status: EpochStatus;
};

export default function EpochPage() {
  const t = useTranslations("EpochManagement");
  const { locale } = useParams();

  // TODO: Replace with real data from Solana program (get_epoch_state())
  const [epochs, setEpochs] = useState<Epoch[]>([
    {
      epoch_id: "epoch_1",
      start_time: new Date("2025-04-02T09:15:45"),
      end_time: null,
      status: "active",
    },
    {
      epoch_id: "epoch_2",
      start_time: new Date("2025-04-01T09:15:45"),
      end_time: new Date("2025-04-02T09:15:44"),
      status: "ended",
    },
  ]);

  // Format date based on user's locale
  const formatDate = (date: Date) => {
    return format(date, "PPpp", {
      locale: locale === "fr" ? fr : enUS,
    });
  };

  // TODO: Connect these handlers to Solana program
  const handleStartEpoch = async () => {
    console.log("Starting new epoch...");
    // TODO: Call start_epoch instruction
  };

  const handleEndEpoch = async (epochId: string) => {
    console.log("Ending epoch:", epochId);
    // TODO: Call end_epoch instruction
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-2 md:p-4">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-xl md:text-2xl font-bold text-center md:text-left">
          {t("title")}
        </h1>
        <Button
          onClick={handleStartEpoch}
          className="w-full md:w-auto border border-white hover:bg-gray-900"
        >
          {t("startEpoch")}
        </Button>
      </div>

      <div className="space-y-3 md:space-y-4">
        {epochs.map((epoch) => (
          <div
            key={epoch.epoch_id}
            className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 md:justify-between">
              <div className="space-y-1 md:space-y-2">
                <h3 className="text-base md:text-lg font-medium">
                  {t("epochId")}: {epoch.epoch_id}
                </h3>
                <div className="flex flex-col text-xs md:text-sm text-gray-400">
                  <p>
                    {t("startTime")}: {formatDate(epoch.start_time)}
                  </p>
                  {epoch.end_time && (
                    <p>
                      {t("endTime")}: {formatDate(epoch.end_time)}
                    </p>
                  )}
                </div>
                <p
                  className={`text-xs md:text-sm ${
                    epoch.status === "active"
                      ? "text-green-500"
                      : epoch.status === "ended"
                      ? "text-red-500"
                      : "text-yellow-500"
                  }`}
                >
                  {t("statusLabel")}: {t(`statusType.${epoch.status}`)}
                </p>
              </div>
              {epoch.status === "active" && (
                <Button
                  onClick={() => handleEndEpoch(epoch.epoch_id)}
                  variant="destructive"
                  className="w-full md:w-auto bg-red-900 hover:bg-red-800 mt-2 md:mt-0"
                >
                  {t("endEpoch")}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
