import { DetailedProposal } from "@/app/[locale]/proposal/[id]/page";
import { useProgram } from "@/context/ProgramContext";
import useSWR from "swr";

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
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
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
