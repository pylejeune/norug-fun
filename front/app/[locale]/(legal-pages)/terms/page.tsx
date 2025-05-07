"use client";

import BackButton from "@/components/ui/BackButton";
import { useTranslations } from "next-intl";

export default function TermsPage() {
  const t = useTranslations("Terms");

  return (
    <div className="container mx-auto px-4 py-8 md:py-12">
      <BackButton />

      <div className="mt-8 space-y-8 max-w-4xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">{t("title")}</h1>
          <p className="mt-2 text-gray-400">{t("lastUpdated")}</p>
          <p className="mt-4 text-gray-300">{t("intro")}</p>
        </div>

        {/* Acceptance */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.acceptance.title")}
          </h2>
          <p className="text-gray-300">{t("sections.acceptance.content")}</p>
        </section>

        {/* Services */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.services.title")}
          </h2>
          <p className="mb-2">{t("sections.services.content")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {t.raw("sections.services.items").map((item: string, i: number) => (
              <li key={i} className="text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Risks */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.risks.title")}
          </h2>
          <p className="mb-2">{t("sections.risks.content")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {t.raw("sections.risks.items").map((item: string, i: number) => (
              <li key={i} className="text-gray-300">
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* Prohibited */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.prohibited.title")}
          </h2>
          <p className="mb-2">{t("sections.prohibited.content")}</p>
          <ul className="list-disc pl-6 space-y-2">
            {t
              .raw("sections.prohibited.items")
              .map((item: string, i: number) => (
                <li key={i} className="text-gray-300">
                  {item}
                </li>
              ))}
          </ul>
        </section>

        {/* Disclaimer */}
        <section>
          <h2 className="text-2xl font-semibold mb-4">
            {t("sections.disclaimer.title")}
          </h2>
          <p className="text-gray-300">{t("sections.disclaimer.content")}</p>
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
