"use client";
import ProposalForm from "@/components/ProposalForm";
import BackButton from "@/components/ui/BackButton";

export default function CreateProposalPage() {
  return (
    <div className="w-full max-w-4xl mx-auto p-4 space-y-6">
      <BackButton />
      <ProposalForm />
    </div>
  );
}
