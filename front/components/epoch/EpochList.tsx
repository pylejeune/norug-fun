"use client";

import { Button } from "@/components/ui/button";
import { EpochState, EpochStatus } from "@/context/ProgramContext";
import { format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type SortField = "epochId" | "startTime" | "endTime";
type SortOrder = "asc" | "desc";

function getStatusType(status: EpochStatus): string {
  if ("active" in status) return "active";
  if ("pending" in status) return "pending";
  if ("closed" in status) return "closed";
  return "unknown";
}

interface EpochListProps {
  epochs: EpochState[];
  locale: string | undefined;
  onEndEpoch: (epochId: number) => Promise<void>;
}

export default function EpochList({
  epochs,
  locale,
  onEndEpoch,
}: EpochListProps) {
  const t = useTranslations("EpochManagement");
  const [sortField, setSortField] = useState<SortField>("epochId");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [loading, setLoading] = useState<number | null>(null);

  const sortedEpochs = useMemo(() => {
    return [...epochs].sort((a, b) => {
      const multiplier = sortOrder === "asc" ? 1 : -1;
      const fieldA =
        sortField === "epochId" ? parseInt(a[sortField]) : a[sortField];
      const fieldB =
        sortField === "epochId" ? parseInt(b[sortField]) : b[sortField];
      return (fieldA - fieldB) * multiplier;
    });
  }, [epochs, sortField, sortOrder]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp * 1000), "PPpp", {
      locale: locale === "fr" ? fr : enUS,
    });
  };

  const handleEndEpoch = async (epochId: string) => {
    try {
      setLoading(parseInt(epochId));

      // 1. Termine l'epoch
      await onEndEpoch(parseInt(epochId));

      // 2. Déclenche le crank
      const response = await fetch("/api/admin/trigger-crank", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to trigger crank");
      }

      toast.success(t("endEpochSuccess"));
    } catch (error) {
      console.error("Failed to end epoch or trigger crank:", error);
      toast.error(t("endEpochError"));
    } finally {
      setLoading(null);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("epochId")}
          className="flex items-center gap-1"
        >
          {t("sortById")}
          {sortField === "epochId" &&
            (sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            ))}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("startTime")}
          className="flex items-center gap-1"
        >
          {t("sortByStart")}
          {sortField === "startTime" &&
            (sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            ))}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => toggleSort("endTime")}
          className="flex items-center gap-1"
        >
          {t("sortByEnd")}
          {sortField === "endTime" &&
            (sortOrder === "asc" ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            ))}
        </Button>
      </div>

      <div className="space-y-3 md:space-y-4">
        {sortedEpochs.map((epoch) => (
          <div
            key={epoch.epochId}
            className="bg-gray-900/50 p-3 md:p-4 rounded-lg border border-gray-800"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-0 md:justify-between">
              <div className="space-y-1 md:space-y-2">
                <h3 className="text-base md:text-lg font-medium">
                  {t("epochId")}: {epoch.epochId}
                </h3>
                <div className="flex flex-col text-xs md:text-sm text-gray-400">
                  <p>
                    {t("startTime")}: {formatDate(epoch.startTime)}
                  </p>
                  <p>
                    {t("endTime")}: {formatDate(epoch.endTime)}
                  </p>
                </div>
                <p
                  className={`text-xs md:text-sm ${
                    "active" in epoch.status
                      ? "text-green-500"
                      : "closed" in epoch.status
                      ? "text-red-500"
                      : "text-yellow-500"
                  }`}
                >
                  {t("statusLabel")}:{" "}
                  {t(`statusType.${getStatusType(epoch.status)}`)}
                </p>
              </div>
              {"active" in epoch.status && (
                <Button
                  variant="destructive"
                  className="w-full md:w-auto bg-red-900 hover:bg-red-800 mt-2 md:mt-0"
                  onClick={() => handleEndEpoch(epoch.epochId)}
                  disabled={loading === parseInt(epoch.epochId)}
                >
                  {loading === parseInt(epoch.epochId) ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin">⏳</span>{" "}
                      {t("endingEpoch")}
                    </span>
                  ) : (
                    t("endEpoch")
                  )}
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
