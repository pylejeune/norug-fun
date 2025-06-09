import {
  createErrorResponse,
  createSuccessResponse,
  verifyAuthToken,
} from "@/lib/utils";
import { randomUUID } from "crypto";
import { NextRequest } from "next/server";
import { closeExpiredEpochs } from "./service";

export async function GET(request: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  console.log(`[${requestId}] 🚀 Closing expired epochs...`);

  // Authentication token verification
  if (!verifyAuthToken(request)) {
    console.error(`[${requestId}] ❌ Authentication failed`);
    return createErrorResponse(
      requestId,
      {
        message: "Unauthorized",
        name: "AuthenticationError",
      },
      401
    );
  }

  try {
    const result = await closeExpiredEpochs();
    console.log(`[${requestId}] ✅ Operation completed: ${result.message}`);

    return createSuccessResponse(requestId, result);
  } catch (error) {
    console.error(`[${requestId}] ❌ Error closing expired epochs:`, error);
    return createErrorResponse(requestId, error);
  }
}
