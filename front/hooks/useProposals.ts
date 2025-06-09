import { useProgram } from "@/context/ProgramContext";
import useSWR from "swr";

/**
 * Hook to fetch and auto-refresh proposals for a given epoch
 */
export function useProposals(epochId?: string) {
  const { getProposalsByEpoch } = useProgram();

  const {
    data: proposals,
    error,
    mutate,
  } = useSWR(
    epochId ? ["proposals", epochId] : null,
    async () => {
      if (!epochId) return [];
      return getProposalsByEpoch(epochId);
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true, // Refresh when user returns to the page
      dedupingInterval: 2000, // Prevent too frequent requests
    }
  );

  return {
    proposals: proposals || [],
    isLoading: !error && !proposals,
    isError: error,
    mutate, // Function to force refresh
  };
}

/**
 * Hook to fetch and auto-refresh all epochs
 */
export function useEpochs() {
  const { getAllEpochs } = useProgram();

  const {
    data: epochs,
    error,
    mutate,
  } = useSWR(
    "epochs",
    async () => {
      return getAllEpochs();
    },
    {
      refreshInterval: 10000, // Refresh every 10 seconds
      revalidateOnFocus: true, // Refresh when user returns to the page
      dedupingInterval: 3000, // Prevent too frequent requests
    }
  );

  return {
    epochs: epochs || [],
    isLoading: !error && !epochs,
    isError: error,
    mutate, // Function to force refresh
  };
}
