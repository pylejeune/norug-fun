"use client";

import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Footer");
  const year = new Date().getFullYear();

  return (
    <footer className="fixed bottom-0 w-full">
      <div className="mx-3 mb-[4.5rem] md:mb-4 md:mx-6">
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-xs text-gray-500">
          <div>{t("copyright", { year })}</div>
          <div className="flex gap-2">
            <a href="/privacy" className="hover:text-gray-300">
              {t("privacy")}
            </a>
            <span> • </span>
            <a href="/terms" className="hover:text-gray-300">
              {t("terms")}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
