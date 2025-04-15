"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

export default function ProposalForm() {
  const t = useTranslations("ProposalForm");
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    ticker: "",
    description: "",
    image: null as File | null,
    totalSupply: "",
    creatorSupply: 10, // Default 10%
    supportersSupply: 10, // Default 10%
  });

  // Handle form submission - will be connected to the program later
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect with Solana program
    console.log("Form submitted:", formData);
  };

  // Handle file drop
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

        {/* Creator Supply Slider */}
        <div>
          <label className="block text-xs md:text-sm font-medium mb-2 md:mb-4">
            {t("creatorSupply", { value: formData.creatorSupply })}
          </label>
          <Slider
            value={[formData.creatorSupply]}
            onValueChange={(value) =>
              setFormData({ ...formData, creatorSupply: value[0] })
            }
            max={100}
            step={1}
          />
        </div>

        {/* Supporters Supply Slider */}
        <div>
          <label className="block text-xs md:text-sm font-medium mb-2 md:mb-4">
            {t("supportersSupply", { value: formData.supportersSupply })}
          </label>
          <Slider
            value={[formData.supportersSupply]}
            onValueChange={(value) =>
              setFormData({ ...formData, supportersSupply: value[0] })
            }
            max={100}
            step={1}
          />
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
