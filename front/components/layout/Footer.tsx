"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useParams } from "next/navigation";

export default function Footer() {
  const t = useTranslations("Footer");
  const { locale } = useParams();
  const year = new Date().getFullYear();

  return (
    <footer className=" bottom-0 w-full">
      <div className="mx-3 mb-[4.5rem] md:mb-4 md:mx-6">
        <div className="flex flex-col items-center justify-center gap-2 py-4 text-center text-xs text-gray-500">
          <div>{t("copyright", { year })}</div>
          <div className="flex gap-2">
            <Link href={`/${locale}/privacy`} className="hover:text-gray-300">
              {t("privacy")}
            </Link>
            <span> • </span>
            <Link href={`/${locale}/terms`} className="hover:text-gray-300">
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
