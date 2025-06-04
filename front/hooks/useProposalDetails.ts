import { DetailedProposal } from "@/app/[locale]/proposal/[id]/page";
import { useProgram } from "@/context/ProgramContext";
import useSWR from "swr";

export function useProposalDetails(proposalId: string | null) {
  const { getProposalDetails, getProposalSupports } = useProgram();

  const {
    data: proposal,
    error: proposalError,
    mutate: mutateProposal,
  } = useSWR(
    proposalId ? ["proposal", proposalId] : null,
    async () => {
      if (!proposalId || !getProposalDetails) return null;
      const details = await getProposalDetails(proposalId);
      if (!details) return null;

      return {
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
      } as DetailedProposal;
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    }
  );

  const {
    data: supports,
    error: supportsError,
    mutate: mutateSupports,
  } = useSWR(
    proposal?.publicKey ? ["supports", proposal.publicKey.toString()] : null,
    async () => {
      if (!proposal?.publicKey || !getProposalSupports) return [];
      return getProposalSupports(proposal.publicKey.toString());
    },
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      dedupingInterval: 1000,
    }
  );

  const forceRefresh = async () => {
    await Promise.all([
      mutateProposal(undefined, {
        revalidate: true,
        rollbackOnError: false,
      }),
      mutateSupports(undefined, {
        revalidate: true,
        rollbackOnError: false,
      }),
    ]);
  };

  return {
    proposal,
    supports,
    isLoading: !proposalError && !proposal,
    isLoadingSupports: !supportsError && !supports,
    error: proposalError || supportsError,
    mutateProposal,
    mutateSupports,
    forceRefresh,
  };
}
