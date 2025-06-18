"use client";

import { useTranslations } from "next-intl";

type Phase2ContentProps = {
  locale: string | undefined;
};

export function Phase2Content({ locale }: Phase2ContentProps) {
  const t = useTranslations("Home");

  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-6xl mb-4">🚧</div>
      <h2 className="text-2xl font-semibold mb-4 text-gray-300">
        Phase 2 (Coming Soon)
      </h2>
    </div>
  );
}
