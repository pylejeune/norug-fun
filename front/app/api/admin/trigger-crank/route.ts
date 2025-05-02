import { NextResponse } from "next/server";
import { runCrankLogic } from "../../../../../crank/src/main";

export async function POST(request: Request) {
  try {
    const result = await runCrankLogic();
    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function isAuthorizedAdmin(authHeader: string | null): boolean {
  // Pour test, retourne true
  return true;
}
