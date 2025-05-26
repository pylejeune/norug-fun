"use client";

import EpochList from "@/components/epoch/EpochList";
import { EpochState, useProgram } from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import Loading from "../loading";

export default function EpochPage() {
  const t = useTranslations("EpochManagement");
  const params = useParams();
  const locale = params.locale as string | undefined;
  const { getAllEpochs, isConnected, endEpoch } = useProgram();
  const [epochs, setEpochs] = useState<EpochState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEpochs = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }

      try {
        const allEpochs = await getAllEpochs();
        setEpochs(allEpochs);
      } catch (error) {
        toast.error(t("fetchEpochsError"), {
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchEpochs();
  }, [getAllEpochs, isConnected, t]);

  if (!isConnected || loading) {
    return <Loading />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <Link
          href={`/${locale}/epoch/create`}
          className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors text-center"
        >
          {t("startEpoch")}
        </Link>
      </div>

      {epochs.length === 0 ? (
        <div className="text-center space-y-4">
          <p>{t("noEpochsMessage")}</p>
          <Link
            href={`/${locale}/epoch/create`}
            className="inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
          >
            {t("startFirstEpoch")}
          </Link>
        </div>
      ) : (
        <EpochList epochs={epochs} locale={locale} onEndEpoch={endEpoch} />
      )}
    </div>
  );
}
