import { DetailedProposal } from "@/app/[locale]/proposal/[id]/page";
import { useProgram } from "@/context/ProgramContext";
import useSWR from "swr";

// ============================================================================
// EPOCHS HOOKS
// ============================================================================

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

// ============================================================================
// PROPOSALS HOOKS
// ============================================================================

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
 * Hook to fetch proposal details with supports using SWR
 */
export function useProposalDetails(proposalId: string | null) {
  const { getProposalDetails, getProposalSupports } = useProgram();

  // Combined SWR query for proposal and supports data
  const { data, error, mutate } = useSWR(
    proposalId ? ["proposalWithSupports", proposalId] : null,
    async () => {
      if (!proposalId || !getProposalDetails || !getProposalSupports)
        return null;

      const details = await getProposalDetails(proposalId);
      if (!details) return null;

      // Transform proposal data
      const proposal: DetailedProposal = {
        id: proposalId,
        name: details.tokenName,
        ticker: details.tokenSymbol,
        description: details.description,
        imageUrl: details.imageUrl,
        epoch_id: details.epochId,
        solRaised: details.solRaised,
        creator: details.creator,
        totalSupply: details.totalSupply,
        creatorAllocation: details.creatorAllocation,
        supporterAllocation: details.supporterAllocation,
        status: details.status,
        totalContributions: details.totalContributions,
        lockupPeriod: details.lockupPeriod,
        publicKey: details.publicKey,
        supporters: details.supporters,
        creationTimestamp: details.creationTimestamp,
      };

      // Fetch supports data
      const supports = await getProposalSupports(details.publicKey.toString());

      return { proposal, supports };
    },
    {
      refreshInterval: 5000, // Refresh every 5 seconds
      revalidateOnFocus: true, // Refresh when user returns to the page
      dedupingInterval: 1000, // Prevent too frequent requests
    }
  );

  // Force refresh function for user actions
  const forceRefresh = async () => {
    await mutate(undefined, {
      revalidate: true,
      rollbackOnError: false,
    });
  };

  return {
    proposal: data?.proposal || null,
    supports: data?.supports || [],
    isLoading: !error && !data,
    isLoadingSupports: !error && !data,
    error,
    forceRefresh,
  };
}
