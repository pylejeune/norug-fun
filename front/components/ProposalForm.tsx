"use client";

import EpochSelector from "@/components/epoch/EpochSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { EpochState, useProgram } from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";

type FormData = {
  name: string;
  ticker: string;
  description: string;
  image: File | null;
  totalSupply: string;
  creatorAllocation: number;
  supportersAllocation: number;
  lockupPeriod: number;
};

export default function ProposalForm() {
  const t = useTranslations("ProposalForm");
  const { createProposal, getAllEpochs } = useProgram();
  const router = useRouter();
  const { locale } = useParams();
  const [selectedEpochId, setSelectedEpochId] = useState<string>();
  const [selectedEpochDetails, setSelectedEpochDetails] =
    useState<EpochState | null>(null);

  // Form state with default values
  const [formData, setFormData] = useState<FormData>({
    name: "",
    ticker: "",
    description: "",
    image: null,
    totalSupply: "",
    creatorAllocation: 0,
    supportersAllocation: 100,
    lockupPeriod: 86400,
  });

  // Load epoch details when one is selected
  useEffect(() => {
    const loadEpochDetails = async () => {
      if (!selectedEpochId) return;
      try {
        const epochs = await getAllEpochs();
        const epoch = epochs.find((e) => e.epochId === selectedEpochId);
        if (epoch) {
          setSelectedEpochDetails(epoch);
          // Update minimum lockup period to epoch end date
          const epochEndDate = new Date(epoch.endTime * 1000);
          if (
            formData.lockupPeriod <
            epochEndDate.getTime() - new Date().getTime()
          ) {
            setFormData((prev) => ({
              ...prev,
              lockupPeriod: epochEndDate.getTime() - new Date().getTime(),
            }));
          }
        }
      } catch (error) {
        console.error("Failed to fetch epoch details:", error);
      }
    };

    loadEpochDetails();
  }, [selectedEpochId, getAllEpochs]);

  // Update supporters allocation when creator allocation changes
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      supportersAllocation: 50 - prev.creatorAllocation,
    }));
  }, [formData.creatorAllocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Starting proposal creation...");
    console.log("Form data:", {
      epochId: selectedEpochId,
      name: formData.name,
      ticker: formData.ticker,
      totalSupply: formData.totalSupply,
      creatorAllocation: formData.creatorAllocation,
      lockupPeriod: formData.lockupPeriod,
    });

    if (!selectedEpochId) {
      toast.error(t("selectEpochFirst"));
      return;
    }

    // Validate creator allocation
    if (formData.creatorAllocation > 10) {
      toast.error(t("creatorAllocationTooHigh"));
      return;
    }

    // Validate total supply
    if (
      isNaN(Number(formData.totalSupply)) ||
      Number(formData.totalSupply) <= 0
    ) {
      toast.error(t("invalidTotalSupply"));
      return;
    }

    // Show loading toast
    const loadingToast = toast.loading(t("submitting"));

    try {
      console.log("Calling program createProposal...");
      await createProposal(
        selectedEpochId,
        formData.name,
        formData.ticker,
        parseInt(formData.totalSupply),
        formData.creatorAllocation,
        formData.lockupPeriod
      );
      console.log("Proposal created successfully!");

      // Show success toast and redirect
      toast.dismiss(loadingToast);
      toast.success(t("proposalCreated"));
      router.push(`/${locale}`);
    } catch (error: any) {
      console.error("Failed to create proposal:", error);
      // Show error toast
      toast.dismiss(loadingToast);
      toast.error(error.message || t("errorCreating"));
    }
  };

  // Handle file upload
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFormData((prev) => ({ ...prev, image: acceptedFiles[0] }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".gif"],
    },
    maxFiles: 1,
  });

  return (
    <div className="w-full max-w-2xl mx-auto p-2 md:p-4">
      <h1 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6">
        {t("title")}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
        <EpochSelector
          selectedEpochId={selectedEpochId}
          onSelect={setSelectedEpochId}
        />
        {/* Project Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-xs md:text-sm font-medium mb-1 md:mb-2"
          >
            {t("projectName")}
          </label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder={t("projectName")}
            required
            className="text-sm md:text-base"
          />
        </div>

        {/* Ticker */}
        <div>
          <label
            htmlFor="ticker"
            className="block text-xs md:text-sm font-medium mb-1 md:mb-2"
          >
            {t("ticker")}
          </label>
          <div className="flex">
            <div className="flex items-center justify-center bg-gray-800 text-gray-300 w-12 rounded-l-md border-y border-l border-gray-700">
              $
            </div>
            <Input
              id="ticker"
              value={formData.ticker}
              onChange={(e) =>
                setFormData({ ...formData, ticker: e.target.value })
              }
              placeholder="TICKER"
              required
              className="uppercase text-sm md:text-base rounded-l-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-xs md:text-sm font-medium mb-1 md:mb-2"
          >
            {t("description")}
          </label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder={t("description")}
            required
            className="min-h-[80px] md:min-h-[100px] text-sm md:text-base"
          />
        </div>

        {/* Image Upload with Drag & Drop */}
        <div>
          <label
            htmlFor="image"
            className="block text-xs md:text-sm font-medium mb-1 md:mb-2"
          >
            {t("image")}
          </label>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-md p-4 text-center cursor-pointer transition-colors
              ${
                isDragActive
                  ? "border-white bg-gray-800"
                  : "border-gray-700 hover:border-gray-500"
              }
            `}
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2">
              {formData.image ? (
                <>
                  <p className="text-xs md:text-sm text-gray-300">
                    {formData.image.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t("dragOrClickToReplace")}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs md:text-sm text-gray-300">
                    {isDragActive
                      ? t("dropToUpload")
                      : t("dragOrClickToUpload")}
                  </p>
                  <p className="text-xs text-gray-500">{t("imageFormat")}</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Total Supply */}
        <div>
          <label
            htmlFor="totalSupply"
            className="block text-xs md:text-sm font-medium mb-1 md:mb-2"
          >
            {t("totalSupply")}
          </label>
          <Input
            id="totalSupply"
            type="number"
            value={formData.totalSupply}
            onChange={(e) =>
              setFormData({ ...formData, totalSupply: e.target.value })
            }
            placeholder={t("totalSupply")}
            required
            className="text-sm md:text-base"
          />
        </div>

        {/* Creator Allocation Slider */}
        <div>
          <label className="block text-xs md:text-sm font-medium mb-2">
            {t("creatorAllocation")}
          </label>
          <div className="space-y-4">
            <Slider
              value={[formData.creatorAllocation]}
              onValueChange={(value) =>
                setFormData({ ...formData, creatorAllocation: value[0] })
              }
              max={10}
              step={0.1}
              className="my-4"
            />
            <div className="flex justify-between text-sm text-gray-400">
              <p>
                {t("creatorAllocationInfo", {
                  value: formData.creatorAllocation.toFixed(1),
                })}
              </p>
              <p>
                {t("supportersAllocationInfo", {
                  value: (50 - formData.creatorAllocation).toFixed(1),
                })}
              </p>
            </div>
          </div>
        </div>

        {/* Lockup Period */}
        <div>
          <label
            htmlFor="lockupPeriod"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            {t("lockupPeriod")}
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              id="lockupPeriod"
              name="lockupPeriod"
              value={Math.floor(formData.lockupPeriod / 86400)}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lockupPeriod:
                    Math.max(1, Math.floor(Number(e.target.value))) * 86400,
                })
              }
              min="1"
              step="1"
              className="block w-full rounded-md bg-gray-800 border-gray-600 text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              required
            />
            <span className="text-gray-400">{t("days")}</span>
          </div>
          <p className="mt-1 text-sm text-gray-400">{t("lockupPeriodHelp")}</p>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="border border-white w-full cursor-pointer hover:bg-gray-900 text-sm md:text-base py-2 md:py-3"
        >
          {t("submit")}
        </Button>
      </form>
    </div>
  );
}
