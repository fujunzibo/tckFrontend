import { NextRequest, NextResponse } from "next/server";
import { DemoError, handleDemoRequest } from "../../../lib/demo-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: NextRequest) {
  const requestId = crypto.randomUUID();
  try {
    if (process.env.MOCK_API_ENABLED !== "true")
      throw new DemoError(
        503,
        "FEATURE_DISABLED",
        "Local preview API is disabled. Configure your backend or enable MOCK_API_ENABLED for local preview.",
      );
    let body: Record<string, unknown> | undefined;
    if (request.method !== "GET") {
      const raw = await request.text();
      if (raw.length > 32768)
        throw new DemoError(413, "VALIDATION_ERROR", "Request too large");
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        throw new DemoError(400, "VALIDATION_ERROR", "Invalid JSON");
      }
      if (!body || Array.isArray(body) || typeof body !== "object")
        throw new DemoError(400, "VALIDATION_ERROR", "Expected an object");
    }
    const data = await handleDemoRequest({
      method: request.method,
      url: request.url,
      token: request.headers.get("authorization")?.replace(/^Bearer /i, ""),
      key: request.headers.get("idempotency-key") ?? undefined,
      body,
    });
    return NextResponse.json(
      { success: true, data, error: null, requestId },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    const known = error instanceof DemoError;
    if (!known) console.error("[wins-preview]", requestId, error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        error: {
          code: known ? error.code : "INTERNAL_ERROR",
          message: known ? error.message : "Preview service failed",
        },
        requestId,
      },
      { status: known ? error.status : 500 },
    );
  }
}
export { handle as GET, handle as POST, handle as PATCH };
