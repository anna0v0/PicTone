import { NextResponse } from "next/server";
import { analyzeImageWithGemini } from "@/lib/gemini";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return jsonError("Invalid form data.", 400);
  }

  const image = formData.get("image");

  if (!(image instanceof File)) {
    return jsonError("Please upload an image.", 400);
  }

  if (!ACCEPTED_TYPES.has(image.type)) {
    return jsonError("Only JPEG, PNG, and WebP images are supported.", 415);
  }

  if (image.size > MAX_IMAGE_BYTES) {
    return jsonError("Image is too large. Please upload an image under 8MB.", 413);
  }

  try {
    const bytes = Buffer.from(await image.arrayBuffer());
    const analysis = await analyzeImageWithGemini({
      base64: bytes.toString("base64"),
      mimeType: image.type,
    });

    return NextResponse.json(analysis);
  } catch (error) {
    if (error instanceof Error && error.message === "missing_api_key") {
      return jsonError("Gemini API key is not configured.", 502, {
        code: "missing_api_key",
      });
    }

    console.error("Gemini image analysis failed", error);

    const upstreamStatus = getErrorStatus(error);

    if (upstreamStatus === 429) {
      return jsonError(
        "Gemini usage is temporarily too high. Please wait a moment and retry.",
        429,
        { code: "rate_limited", retryable: true },
      );
    }

    if (upstreamStatus === 503) {
      return jsonError(
        "Gemini is temporarily busy. Please wait a moment and retry.",
        503,
        { code: "service_busy", retryable: true },
      );
    }

    if (upstreamStatus === 401 || upstreamStatus === 403) {
      return jsonError("The Gemini API key or permissions are invalid.", 502, {
        code: "gemini_auth_error",
      });
    }

    if (isTimeoutError(error)) {
      return jsonError("Gemini took too long to respond. Please retry.", 504, {
        code: "timeout",
        retryable: true,
      });
    }

    return jsonError("Gemini could not analyze this image right now.", 502, {
      code: "gemini_error",
      retryable: true,
    });
  }
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("status" in error)) {
    return undefined;
  }

  return typeof error.status === "number" ? error.status : undefined;
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = `${error.name} ${error.message}`.toLowerCase();
  return message.includes("timeout") || message.includes("timed out");
}

function jsonError(
  message: string,
  status: number,
  details: { code?: string; retryable?: boolean } = {},
) {
  return NextResponse.json({ error: message, ...details }, { status });
}
