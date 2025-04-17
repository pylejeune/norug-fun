"use client";

import { getProgram } from "@/context/program";
import { BN, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createContext, useContext, useMemo, useState } from "react";
import { Programs } from "./types/programs";

export type { Programs };

type ProgramType = Program<Programs>;

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
};

const ProgramContext = createContext<ProgramContextType | null>(null);

export function ProgramProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const isConnected = !!wallet;

  const program = useMemo(() => {
    if (connection) {
      return getProgram(connection, wallet);
    }
    return null;
  }, [connection, wallet]);

  const getEpochState = async (epochId: number): Promise<EpochState | null> => {
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
  };

  const startEpoch = async (
    epochId: number,
    startTime: string,
    endTime: string
  ) => {
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
      const tx = await program.methods
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
  };

  const getAllEpochs = async (): Promise<EpochState[]> => {
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
  };

  const endEpoch = async (epochId: number) => {
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
      const tx = await program.methods
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
  };

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
    }),
    [program, isConnected, error, success]
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
