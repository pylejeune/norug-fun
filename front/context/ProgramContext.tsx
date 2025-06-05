"use client";
import { Programs } from "@/idl/programs";
import {
  getProgramContext,
  AnchorWallet as UtilsAnchorWallet,
} from "@/lib/utils";
import { BN, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

// --- Types and Interfaces ---
export type { Programs };
type ProgramType = Program<Programs>;
export type ProposalStatus = "active" | "validated" | "rejected";

export type EpochStatus =
  | Programs["types"][2]["type"]["variants"][0]
  | Programs["types"][2]["type"]["variants"][1]
  | Programs["types"][2]["type"]["variants"][2];

export type EpochState = {
  epochId: string;
  startTime: number;
  endTime: number;
  status: EpochStatus;
  publicKey: PublicKey;
};

export type ProposalState = {
  epochId: string;
  creator: PublicKey;
  tokenName: string;
  tokenSymbol: string;
  totalSupply: number;
  creatorAllocation: number;
  supporterAllocation: number;
  solRaised: number;
  totalContributions: number;
  lockupPeriod: number;
  status: ProposalStatus;
  publicKey: PublicKey;
  imageUrl?: string;
  creationTimestamp: number;
};

export type ProposalSupport = {
  user: PublicKey;
  amount: number;
  timestamp: number;
  tokenAllocation: number;
  rank: number;
};

type ProgramContextType = {
  program: ProgramType | null;
  isConnected: boolean;
  error: string;
  success: string;
  setError: (error: string) => void;
  setSuccess: (success: string) => void;
  startEpoch: (
    epochId: number,
    startTime: string,
    endTime: string
  ) => Promise<void>;
  getEpochState: (epochId: number) => Promise<EpochState | null>;
  getAllEpochs: () => Promise<EpochState[]>;
  endEpoch: (epochId: number) => Promise<void>;
  createProposal: (
    epochId: string,
    tokenName: string,
    tokenSymbol: string,
    description: string,
    totalSupply: number,
    creatorAllocation: number,
    lockupPeriod: number,
    imageUrl: string | null
  ) => Promise<void>;
  getAllProposals: () => Promise<ProposalState[]>;
  getProposalDetails: (proposalId: string) => Promise<any>;
  supportProposal: (proposalId: string, amount: number) => Promise<void>;
  getUserProposals: (userAddress: PublicKey) => Promise<ProposalState[]>;
  getUserSupportedProposals: (
    userAddress: PublicKey
  ) => Promise<ProposalState[]>;
  getProposalSupports: (proposalId: string) => Promise<ProposalSupport[]>;
  reclaimSupport: (proposal: PublicKey, epochId: number) => Promise<string>;
  getProposalsByEpoch: (epochId: string) => Promise<ProposalState[]>;
};

// --- Context Creation ---
const ProgramContext = createContext<ProgramContextType | null>(null);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  // --- State & Connection Setup ---
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const isConnected = !!wallet;

  // --- Program Initialization ---
  const program = useMemo(() => {
    if (connection) {
      // Cast le wallet pour qu'il corresponde au type attendu par utils.ts
      const compatibleWallet = wallet
        ? {
            publicKey: wallet.publicKey,
            signTransaction:
              wallet.signTransaction as UtilsAnchorWallet["signTransaction"],
            signAllTransactions:
              wallet.signAllTransactions as UtilsAnchorWallet["signAllTransactions"],
          }
        : undefined;

      return getProgramContext(connection, compatibleWallet);
    }
    return null;
  }, [connection, wallet]);

  // --- Getters ---
  const getAllProposals = useCallback(async (): Promise<ProposalState[]> => {
    if (!program) return [];

    try {
      const proposals = await (
        program as ProgramType
      ).account.tokenProposal.all();

      const mappedProposals = proposals.map((p: any) => ({
        epochId: p.account.epochId.toString(),
        creator: p.account.creator,
        tokenName: p.account.tokenName,
        tokenSymbol: p.account.tokenSymbol,
        totalSupply: p.account.totalSupply.toNumber(),
        creatorAllocation: p.account.creatorAllocation,
        supporterAllocation: p.account.supporterAllocation,
        solRaised: p.account.solRaised.toNumber(),
        totalContributions: p.account.totalContributions.toNumber(),
        lockupPeriod: p.account.lockupPeriod.toNumber(),
        status: p.account.status,
        publicKey: p.publicKey,
        imageUrl: p.account.imageUrl,
        creationTimestamp: p.account.creationTimestamp.toNumber(),
      }));

      return mappedProposals.sort(
        (a, b) => b.creationTimestamp - a.creationTimestamp
      );
    } catch (err) {
      console.error("Error fetching proposals:", err);
      return [];
    }
  }, [program]);

  const getEpochState = useCallback(
    async (epochId: number): Promise<EpochState | null> => {
      if (!program) return null;

      try {
        const [epochManagementPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("epoch"), new BN(epochId).toArrayLike(Buffer, "le", 8)],
          program.programId
        );

        const epochAccount = await (
          program as ProgramType
        ).account.epochManagement.fetch(epochManagementPDA);

        return {
          epochId: epochAccount.epochId.toString(),
          startTime: epochAccount.startTime.toNumber(),
          endTime: epochAccount.endTime.toNumber(),
          status: epochAccount.status,
          publicKey: epochManagementPDA,
        };
      } catch (err: any) {
        // If account not found, return null
        if (err.message.includes("Account does not exist")) {
          return null;
        }
        console.error("❌ Error getting epoch state:", err);
        return null;
      }
    },
    [program]
  );

  const getAllEpochs = useCallback(async (): Promise<EpochState[]> => {
    if (!program) return [];

    try {
      const allEpochs = await (
        program as ProgramType
      ).account.epochManagement.all();

      return allEpochs.map((epoch) => ({
        epochId: epoch.account.epochId.toString(),
        startTime: epoch.account.startTime.toNumber(),
        endTime: epoch.account.endTime.toNumber(),
        status: epoch.account.status,
        publicKey: epoch.publicKey,
      }));
    } catch (err: any) {
      console.error("❌ Error fetching epochs:", err);
      return [];
    }
  }, [program]);

  const getProposalsByEpoch = useCallback(
    async (epochId: string): Promise<ProposalState[]> => {
      if (!program) return [];

      try {
        // Récupérer toutes les propositions
        const proposals = await (
          program as ProgramType
        ).account.tokenProposal.all();

        // Filtrer les propositions par epochId
        const filteredProposals = proposals
          .filter((p: any) => p.account.epochId.toString() === epochId)
          .map((p: any) => ({
            epochId: p.account.epochId.toString(),
            creator: p.account.creator,
            tokenName: p.account.tokenName,
            tokenSymbol: p.account.tokenSymbol,
            totalSupply: p.account.totalSupply.toNumber(),
            creatorAllocation: p.account.creatorAllocation,
            supporterAllocation: p.account.supporterAllocation,
            solRaised: p.account.solRaised.toNumber(),
            totalContributions: p.account.totalContributions.toNumber(),
            lockupPeriod: p.account.lockupPeriod.toNumber(),
            status: p.account.status,
            publicKey: p.publicKey,
            imageUrl: p.account.imageUrl,
            creationTimestamp: p.account.creationTimestamp.toNumber(),
          }));

        // Tri par timestamp décroissant
        return filteredProposals.sort(
          (a, b) => b.creationTimestamp - a.creationTimestamp
        );
      } catch (err) {
        console.error("Error fetching proposals for epoch:", err);
        return [];
      }
    },
    [program]
  );

  const getProposalDetails = useCallback(
    async (proposalId: string) => {
      if (!program) throw new Error("Program not initialized");

      try {
        console.log("Fetching proposal:", proposalId);
        const proposal = await (
          program as ProgramType
        ).account.tokenProposal.fetch(new PublicKey(proposalId));

        // Debug logs pour le timestamp
        const convertedTimestamp = proposal.creationTimestamp.toNumber();
        console.log("Converted timestamp:", convertedTimestamp);
        console.log(
          "As date:",
          new Date(convertedTimestamp * 1000).toISOString()
        );

        return {
          epochId: proposal.epochId.toString(),
          creator: proposal.creator,
          tokenName: proposal.tokenName,
          tokenSymbol: proposal.tokenSymbol,
          description: proposal.description,
          imageUrl: proposal.imageUrl,
          totalSupply: proposal.totalSupply.toNumber(),
          creatorAllocation: proposal.creatorAllocation,
          supporterAllocation: proposal.supporterAllocation,
          solRaised: proposal.solRaised.toNumber() / LAMPORTS_PER_SOL,
          totalContributions: proposal.totalContributions.toNumber(),
          lockupPeriod: proposal.lockupPeriod.toNumber(),
          status: proposal.status,
          publicKey: new PublicKey(proposalId),
          creationTimestamp: convertedTimestamp,
        };
      } catch (error) {
        console.error("Failed to fetch proposal details:", error);
        return null;
      }
    },
    [program]
  );

  const getProposalSupports = useCallback(
    async (proposalId: string): Promise<ProposalSupport[]> => {
      if (!program) throw new Error("Program not initialized");

      try {
        const proposal = await (
          program as ProgramType
        ).account.tokenProposal.fetch(new PublicKey(proposalId));

        const allAccounts = await (
          program as ProgramType
        ).account.userProposalSupport.all();

        type SupportAccount = {
          account: {
            user: PublicKey;
            amount: BN;
            proposal: PublicKey;
          };
        };

        const proposalSupports = allAccounts
          .filter(
            (acc: SupportAccount) =>
              acc.account.proposal.toString() === proposalId
          )
          .map((support: SupportAccount) => ({
            user: support.account.user,
            amount: support.account.amount.toNumber() / LAMPORTS_PER_SOL,
            timestamp: Date.now(),
            tokenAllocation: 0,
          }));

        // Calculer le total des SOL investis
        const totalSolRaised = proposalSupports.reduce(
          (sum, support) => sum + support.amount,
          0
        );

        // Calculer le pourcentage de tokens pour chaque supporter
        const supporterAllocation = proposal.supporterAllocation;

        // Trier par montant investi (décroissant) et calculer le % individuel
        const sortedSupports = proposalSupports
          .map((support) => ({
            ...support,
            tokenAllocation:
              totalSolRaised > 0
                ? (support.amount / totalSolRaised) * supporterAllocation // Pourcentage direct de l'allocation supporter
                : 0,
          }))
          .sort((a, b) => b.amount - a.amount)
          .map((support, index) => ({
            ...support,
            rank: index + 1,
          }));

        return sortedSupports;
      } catch (error) {
        console.error("Failed to fetch proposal supports:", error);
        throw error;
      }
    },
    [program]
  );

  const getUserProposals = useCallback(
    async (userAddress: PublicKey): Promise<ProposalState[]> => {
      if (!program) throw new Error("Program not initialized");

      try {
        const allProposals = await getAllProposals();
        const proposals = allProposals.filter(
          (proposal) => proposal.creator.toString() === userAddress.toString()
        );

        // Trier les propositions par timestamp
        proposals.sort((a, b) => b.creationTimestamp - a.creationTimestamp);

        return proposals;
      } catch (error) {
        console.error("Failed to fetch user proposals:", error);
        throw error;
      }
    },
    [program, getAllProposals]
  );

  const getUserSupportedProposals = useCallback(
    async (userAddress: PublicKey): Promise<ProposalState[]> => {
      if (!program) throw new Error("Program not initialized");

      try {
        const allProposals = await getAllProposals();
        const supportedProposals = [];

        for (const proposal of allProposals) {
          try {
            const [userSupportPDA] = PublicKey.findProgramAddressSync(
              [
                Buffer.from("support"),
                new BN(proposal.epochId).toArrayLike(Buffer, "le", 8),
                userAddress.toBytes(),
                proposal.publicKey.toBytes(),
              ],
              program.programId
            );

            const support = await (
              program as ProgramType
            ).account.userProposalSupport.fetch(userSupportPDA);

            if (support) {
              supportedProposals.push({
                ...proposal,
                userSupportAmount: support.amount.toNumber() / LAMPORTS_PER_SOL,
              });
            }
          } catch (err) {
            // If account doesn't exist, continue
            continue;
          }
        }

        // Trier les propositions par timestamp
        supportedProposals.sort(
          (a, b) => b.creationTimestamp - a.creationTimestamp
        );

        return supportedProposals;
      } catch (error) {
        console.error("Failed to fetch user supported proposals:", error);
        throw error;
      }
    },
    [program, getAllProposals]
  );

  // --- Actions ---
  const startEpoch = useCallback(
    async (epochId: number, startTime: string, endTime: string) => {
      if (!program || !isConnected || !wallet) {
        console.error("❌ Program not initialized or wallet not connected");
        throw new Error("Please connect your wallet first");
      }

      try {
        // Check wallet balance and request airdrop if needed
        const balance = await connection.getBalance(wallet.publicKey);
        if (balance < LAMPORTS_PER_SOL) {
          console.log("💰 Requesting airdrop for transaction fees...");
          const signature = await connection.requestAirdrop(
            wallet.publicKey,
            2 * LAMPORTS_PER_SOL
          );
          await connection.confirmTransaction(signature);
        }

        // Convert dates to timestamps
        const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
        const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

        // Generate PDA for epoch management account
        const [epochManagementPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("epoch"), new BN(epochId).toArrayLike(Buffer, "le", 8)],
          program.programId
        );

        // Log available methods for debugging
        console.log("📝 Available methods:", Object.keys(program.methods));

        // Start the epoch
        const tx = await (program as Program).methods
          .startEpoch(
            new BN(epochId),
            new BN(startTimestamp),
            new BN(endTimestamp)
          )
          .accounts({
            authority: wallet.publicKey,
            epoch_management: epochManagementPDA,
            system_program: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ Transaction:", tx);
        setSuccess("Epoch started successfully");
      } catch (err: any) {
        console.error("❌ Error:", err);
        setError(err.message);
        throw err;
      }
    },
    [program, isConnected, wallet, connection]
  );

  const endEpoch = useCallback(
    async (epochId: number) => {
      if (!program || !isConnected || !wallet) {
        console.error("❌ Program not initialized or wallet not connected");
        throw new Error("Please connect your wallet first");
      }

      try {
        // Check if epoch exists and is active
        const epochState = await getEpochState(epochId);
        if (!epochState) {
          throw new Error("Epoch not found");
        }

        if (!("active" in epochState.status)) {
          throw new Error("Epoch is not active");
        }

        // Generate PDA with same format as getEpochState
        const [epochManagementPDA] = PublicKey.findProgramAddressSync(
          [Buffer.from("epoch"), new BN(epochId).toArrayLike(Buffer, "le", 8)],
          program.programId
        );

        console.log("🔑 Ending epoch with PDA:", epochManagementPDA.toBase58());

        // End the epoch
        const tx = await (program as Program).methods
          .endEpoch(new BN(epochId))
          .accounts({
            epoch_management: epochManagementPDA,
            authority: wallet.publicKey,
            system_program: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ Epoch ended:", tx);
        setSuccess("Epoch ended successfully");

        // Refresh epochs list
        await getAllEpochs();
      } catch (err: any) {
        console.error("❌ Error ending epoch:", err);
        setError(err.message);
        throw err;
      }
    },
    [program, isConnected, wallet, getEpochState, getAllEpochs]
  );

  const createProposal = useCallback(
    async (
      epochId: string,
      tokenName: string,
      tokenSymbol: string,
      description: string,
      totalSupply: number,
      creatorAllocation: number,
      lockupPeriod: number,
      imageUrl: string | null
    ) => {
      if (!program || !isConnected || !wallet) {
        throw new Error("Please connect your wallet first");
      }

      try {
        console.log("Creating proposal with params:", {
          epochId,
          tokenName,
          tokenSymbol,
          description,
          totalSupply,
          creatorAllocation,
          lockupPeriod,
          imageUrl,
        });

        // Get epoch
        const epochState = await getEpochState(parseInt(epochId));
        if (!epochState) {
          throw new Error("Epoch not found");
        }

        // Check if epoch is active
        if (!("active" in epochState.status)) {
          throw new Error("Epoch is not active");
        }

        // Generate PDA for proposal
        const [proposalPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("proposal"),
            wallet.publicKey.toBytes(),
            new BN(epochId).toArrayLike(Buffer, "le", 8),
            Buffer.from(tokenName),
          ],
          program.programId
        );

        const tx = await (program as Program).methods
          .createProposal(
            tokenName,
            tokenSymbol,
            description,
            imageUrl,
            new BN(totalSupply),
            creatorAllocation,
            new BN(lockupPeriod)
          )
          .accounts({
            creator: wallet.publicKey,
            token_proposal: proposalPDA,
            epoch: epochState.publicKey,
            system_program: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ Proposal created with tx:", tx);
        console.log("Description saved:", description);
        setSuccess("Proposal created successfully");
      } catch (err: any) {
        console.error("❌ Error creating proposal:", err);
        console.log("Description that failed:", description);
        setError(err.message);
        throw err;
      }
    },
    [program, isConnected, wallet, getEpochState]
  );

  const supportProposal = useCallback(
    async (proposalId: string, amount: number) => {
      if (!program || !isConnected || !wallet) {
        throw new Error("Please connect your wallet first");
      }

      try {
        // Get proposal details
        const proposal = await getProposalDetails(proposalId);
        if (!proposal) {
          throw new Error("Proposal not found");
        }

        // Check if user has already supported this proposal
        try {
          const [userSupportPDA] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("support"),
              new BN(proposal.epochId).toArrayLike(Buffer, "le", 8),
              wallet.publicKey.toBytes(),
              proposal.publicKey.toBytes(),
            ],
            program.programId
          );

          await (program as ProgramType).account.userProposalSupport.fetch(
            userSupportPDA
          );
        } catch (err: any) {
          // If account doesn't exist, continue
          if (!err.message.includes("Account does not exist")) {
            throw err;
          }
        }

        // Get epoch state
        const epochState = await getEpochState(parseInt(proposal.epochId));
        if (!epochState) {
          throw new Error("Epoch not found");
        }

        // Convert amount to lamports
        const amountLamports = new BN(amount * LAMPORTS_PER_SOL);

        // Generate PDA for user support
        const [userSupportPDA] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("support"),
            new BN(proposal.epochId).toArrayLike(Buffer, "le", 8),
            wallet.publicKey.toBytes(),
            proposal.publicKey.toBytes(),
          ],
          program.programId
        );

        // Execute support instruction
        const tx = await (program as Program).methods
          .supportProposal(amountLamports)
          .accounts({
            user: wallet.publicKey,
            epoch: epochState.publicKey,
            proposal: proposal.publicKey,
            user_support: userSupportPDA,
            system_program: SystemProgram.programId,
          })
          .rpc();

        console.log("✅ Proposal supported:", tx);
        setSuccess("Successfully supported proposal");

        // Refresh proposal details
        await getProposalDetails(proposalId);
      } catch (err: any) {
        console.error("❌ Error supporting proposal:", err);
        setError(err.message);
        throw err;
      }
    },
    [program, isConnected, wallet, getProposalDetails, getEpochState]
  );

  const reclaimSupport = useCallback(
    async (proposal: PublicKey, epochId: number) => {
      if (!wallet?.publicKey || !program)
        throw new Error("Wallet not connected");

      try {
        // Dériver le PDA pour user support
        const [userSupportPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("support"),
            new BN(epochId).toArrayLike(Buffer, "le", 8),
            wallet.publicKey.toBytes(),
            proposal.toBytes(),
          ],
          program.programId
        );

        const [epochPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("epoch"), new BN(epochId).toArrayLike(Buffer, "le", 8)],
          program.programId
        );

        const tx = await (program as Program).methods
          .reclaimSupport()
          .accounts({
            user: wallet.publicKey,
            tokenProposal: proposal,
            user_support: userSupportPda,
            epoch_management: epochPda,
            system_program: SystemProgram.programId,
          })
          .rpc();

        return tx;
      } catch (error) {
        console.error("Error reclaiming support:", error);
        throw error;
      }
    },
    [program, wallet]
  );

  // --- Context Value & Provider ---
  const value = useMemo(
    () => ({
      program,
      isConnected,
      error,
      success,
      setError,
      setSuccess,
      startEpoch,
      getEpochState,
      getAllEpochs,
      endEpoch,
      createProposal,
      getAllProposals,
      getProposalDetails,
      supportProposal,
      getUserProposals,
      getUserSupportedProposals,
      getProposalSupports,
      reclaimSupport,
      getProposalsByEpoch,
    }),
    [
      program,
      isConnected,
      error,
      success,
      startEpoch,
      getEpochState,
      getAllEpochs,
      endEpoch,
      createProposal,
      getAllProposals,
      getProposalDetails,
      supportProposal,
      getUserProposals,
      getUserSupportedProposals,
      getProposalSupports,
      reclaimSupport,
      getProposalsByEpoch,
    ]
  );

  return (
    <ProgramContext.Provider value={value}>{children}</ProgramContext.Provider>
  );
}

export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error("useProgram must be used within a ProgramProvider");
  }
  return context;
}
