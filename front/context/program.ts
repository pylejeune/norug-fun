import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { AnchorWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import idl from "./idl/programs.json";

// Use Program ID from IDL
export const PROGRAM_ID = new PublicKey(idl.address);

console.log("📝 IDL Details:", {
  name: idl.metadata.name,
  version: idl.metadata.version,
  address: idl.address,
});

// Log available instructions
console.log(
  "📝 Available instructions:",
  idl.instructions.map((ix) => ix.name)
);

export function getProgram(
  connection: Connection,
  wallet: AnchorWallet | null | undefined
) {
  if (!wallet) {
    console.log("💡 No wallet connected yet");
    return null;
  }

  try {
    const provider = new AnchorProvider(connection, wallet, {
      preflightCommitment: "processed",
    });

    // Pass Program ID from IDL
    const program = new Program(idl as any, provider);

    // Log available instructions for debugging
    console.log(
      "📝 Available instructions:",
      idl.instructions.map((ix) => ix.name)
    );

    return program;
  } catch (error: any) {
    console.error("❌ Error creating program:", error);
    return null;
  }
}
