"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Loading");

  return (
    <div className="flex items-center justify-center flex-col text-center">
      <h2 className="mb-3 text-xl font-semibold text-white">{t("title")}</h2>
      <div className="flex items-center justify-center gap-1 text-sm text-gray-400">
        <span>{t("message")}</span>
        <span className="flex gap-1">
          <span className="animate-bounce" style={{ animationDelay: "0s" }}>
            .
          </span>
          <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>
            .
          </span>
          <span className="animate-bounce" style={{ animationDelay: "0.4s" }}>
            .
          </span>
        </span>
      </div>
    </div>
  );
}
