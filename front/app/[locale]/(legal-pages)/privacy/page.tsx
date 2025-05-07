"use client";

import BackButton from "@/components/ui/BackButton";
import { useTranslations } from "next-intl";

export default function PrivacyPage() {
  const t = useTranslations("Privacy");

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <BackButton />

      <div className="mt-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-gray-400">{t("lastUpdated")}</p>
          <p className="mt-4 text-gray-300">{t("intro")}</p>
        </div>

        {/* Collection */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.collection.title")}
          </h2>
          <p className="mb-2">{t("sections.collection.content")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {t
              .raw("sections.collection.items")
              .map((item: string, i: number) => (
                <li key={i} className="text-gray-300">
                  {item}
                </li>
              ))}
          </ul>
        </section>

        {/* Usage */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.usage.title")}
          </h2>
          <p className="mb-2">{t("sections.usage.content")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {t.raw("sections.usage.items").map((item: string, i: number) => (
              <li key={i} className="text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Storage */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.storage.title")}
          </h2>
          <p className="text-gray-300">{t("sections.storage.content")}</p>
        </section>

        {/* Sharing */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.sharing.title")}
          </h2>
          <p className="text-gray-300">{t("sections.sharing.content")}</p>
        </section>

        {/* Contact */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.contact.title")}
          </h2>
          <p className="mb-4">{t("sections.contact.content")}</p>
          <p className="text-gray-300">contact@no-rug.fun</p>
        </section>
      </div>
    </div>
  );
}
