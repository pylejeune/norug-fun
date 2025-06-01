import { useProgram } from "@/context/ProgramContext";
import useSWR from "swr";

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
      refreshInterval: 5000, // Rafraîchir toutes les 5 secondes
      revalidateOnFocus: true, // Rafraîchir quand l'utilisateur revient sur la page
      dedupingInterval: 2000, // Éviter les requêtes trop fréquentes
    }
  );

  return {
    proposals: proposals || [],
    isLoading: !error && !proposals,
    isError: error,
    mutate, // Pour forcer une mise à jour
  };
}
