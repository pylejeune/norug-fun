"use client";

import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";

export default function BackButton() {
  const t = useTranslations();
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="flex items-center text-gray-400 hover:text-white transition-colors"
    >
      <ArrowLeft className="w-5 h-5 mr-2" />
      {t("backButton")}
    </button>
  );
} 