"use client";

import EpochForm from "@/components/EpochForm";
import BackButton from "@/components/ui/BackButton";

export default function CreatePage() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <div className="flex items-center mb-6">
        <BackButton />
      </div>
      <EpochForm />
    </div>
  );
}
