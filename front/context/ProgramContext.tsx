"use client";

import { getProgram } from "@/context/program";
import { BN, Program } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { createContext, useContext, useMemo, useState } from "react";

// Define program type
type ProgramType = Program<any>;

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
      // Check balance first
      const balance = await connection.getBalance(wallet.publicKey);
      if (balance < LAMPORTS_PER_SOL) {
        console.log("💰 Requesting airdrop for transaction fees...");
        const signature = await connection.requestAirdrop(
          wallet.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(signature);
      }

      console.log("🚀 Starting epoch with params:", {
        epochId,
        startTime,
        endTime,
      });

      const startTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      const endTimestamp = Math.floor(new Date(endTime).getTime() / 1000);

      const [epochManagementPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("epoch"), Buffer.from(epochId.toString())],
        program.programId
      );

      // Log les méthodes disponibles pour debug
      console.log("📝 Available methods:", Object.keys(program.methods));

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

  const value = useMemo(
    () => ({
      program,
      isConnected,
      error,
      success,
      setError,
      setSuccess,
      startEpoch,
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
