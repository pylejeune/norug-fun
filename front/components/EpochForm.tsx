"use client";

import { useProgram } from "@/context/ProgramContext";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { toast } from "sonner";

type EpochFormData = {
  epochId: string;
  startTime: string;
  endTime: string;
};

export default function EpochForm() {
  const t = useTranslations("EpochForm");
  const router = useRouter();
  const { startEpoch } = useProgram();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<EpochFormData>>({});

  // Function to format date for datetime-local input with local time
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Calculate default dates
  const getDefaultDates = () => {
    const now = new Date();

    // Start date: next day at 00:00
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + 1);
    startDate.setHours(0, 0, 0, 0);

    // End date: start date + 24h
    const endDate = new Date(startDate);
    endDate.setHours(24, 0, 0, 0);

    return {
      startDate,
      endDate,
      now, // Also return current time for validation
    };
  };

  const defaultDates = getDefaultDates();

  const [formData, setFormData] = useState<EpochFormData>({
    epochId: "",
    startTime: formatDateForInput(defaultDates.startDate),
    endTime: formatDateForInput(defaultDates.endDate),
  });

  const validate = () => {
    const newErrors: Partial<EpochFormData> = {};
    const now = new Date();

    if (!formData.epochId) {
      newErrors.epochId = t("epochIdRequired");
      toast.error(t("epochIdRequired"));
    }

    // Start time validation
    if (!formData.startTime) {
      newErrors.startTime = t("startTimeRequired");
      toast.error(t("startTimeRequired"));
    } else {
      const startDate = new Date(formData.startTime);

      if (isNaN(startDate.getTime())) {
        newErrors.startTime = t("invalidDate");
        toast.error(t("invalidDate"));
      } else if (startDate <= now) {
        newErrors.startTime = t("startTimeInPast");
        toast.error(t("startTimeInPast"));
      } else if (startDate.getFullYear() > now.getFullYear() + 2) {
        newErrors.startTime = t("startTimeTooFar");
        toast.error(t("startTimeTooFar"));
      }
    }

    // End time validation
    if (!formData.endTime) {
      newErrors.endTime = t("endTimeRequired");
      toast.error(t("endTimeRequired"));
    } else {
      const endDate = new Date(formData.endTime);
      const startDate = new Date(formData.startTime);

      if (isNaN(endDate.getTime())) {
        newErrors.endTime = t("invalidDate");
        toast.error(t("invalidDate"));
      } else if (endDate <= startDate) {
        newErrors.endTime = t("endTimeAfterStart");
        toast.error(t("endTimeAfterStart"));
      } else if (endDate.getFullYear() > now.getFullYear() + 2) {
        newErrors.endTime = t("endTimeTooFar");
        toast.error(t("endTimeTooFar"));
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      console.log("❌ Form validation failed");
      return;
    }

    setIsSubmitting(true);

    try {
      await startEpoch(
        parseInt(formData.epochId),
        formData.startTime,
        formData.endTime
      );

      toast.success(t("epochCreated"));

      // Reset form
      setFormData({
        epochId: "",
        startTime: "",
        endTime: "",
      });
      setErrors({});

      router.back();
    } catch (error: any) {
      console.error("❌ Error in form submission:", {
        error,
        message: error.message,
      });
      toast.error(error.message || t("errorCreating"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-center">{t("title")}</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Epoch ID */}
        <div>
          <label htmlFor="epochId" className="block text-sm font-medium mb-1">
            {t("epochId")}
          </label>
          <input
            type="text"
            id="epochId"
            value={formData.epochId}
            onChange={(e) =>
              setFormData({ ...formData, epochId: e.target.value })
            }
            className="w-full p-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.epochId && (
            <p className="mt-1 text-sm text-red-500">{errors.epochId}</p>
          )}
        </div>

        {/* Start Time */}
        <div>
          <label htmlFor="startTime" className="block text-sm font-medium mb-1">
            {t("startTime")}
          </label>
          <input
            type="datetime-local"
            id="startTime"
            value={formData.startTime}
            min={formatDateForInput(new Date())}
            onChange={(e) =>
              setFormData({ ...formData, startTime: e.target.value })
            }
            className="w-full p-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.startTime && (
            <p className="mt-1 text-sm text-red-500">{errors.startTime}</p>
          )}
        </div>

        {/* End Time */}
        <div>
          <label htmlFor="endTime" className="block text-sm font-medium mb-1">
            {t("endTime")}
          </label>
          <input
            type="datetime-local"
            id="endTime"
            value={formData.endTime}
            min={formData.startTime} // Empêche de sélectionner une date avant la date de début
            onChange={(e) =>
              setFormData({ ...formData, endTime: e.target.value })
            }
            className="w-full p-2 bg-gray-800 rounded-lg border border-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {errors.endTime && (
            <p className="mt-1 text-sm text-red-500">{errors.endTime}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? t("creating") : t("submit")}
        </button>
      </form>
    </div>
  );
}
