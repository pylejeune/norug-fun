"use client";

import { useTranslations } from "next-intl";

export default function Loading() {
  const t = useTranslations("Loading");

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
      <div className="text-center">
        {/* Main title */}
        <h2 className="text-xl font-semibold mb-3 text-white">{t("title")}</h2>

        {/* Loading message with animated dots */}
        <div className="flex items-center justify-center gap-1 text-gray-400 text-sm">
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
    </div>
  );
}
