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
      return jsonError("Gemini API key is not configured.", 502);
    }

    console.error("Gemini image analysis failed", error);
    return jsonError("Gemini could not analyze this image right now.", 502);
  }
}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}
