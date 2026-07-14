import { GoogleGenAI, Type } from "@google/genai";

export type StyleAnalysis = {
  style: BilingualText;
  colors: ColorKeyword[];
  mood: BilingualText[];
  layout: BilingualText;
  lighting: BilingualText;
  composition: BilingualText;
  promptSummary: BilingualText;
};

type BilingualText = {
  en: string;
  zh: string;
};

type ColorKeyword = BilingualText & {
  hex: string;
};

const bilingualTextSchema = {
  type: Type.OBJECT,
  properties: {
    en: {
      type: Type.STRING,
      description: "Natural English description.",
    },
    zh: {
      type: Type.STRING,
      description: "Natural Traditional Chinese description.",
    },
  },
  required: ["en", "zh"],
};

const colorKeywordSchema = {
  type: Type.OBJECT,
  properties: {
    en: {
      type: Type.STRING,
      description: "Short English color keyword.",
    },
    zh: {
      type: Type.STRING,
      description: "Short Traditional Chinese color keyword.",
    },
    hex: {
      type: Type.STRING,
      description:
        "Representative RGB hex color code for this color, formatted as #RRGGBB.",
    },
  },
  required: ["en", "zh", "hex"],
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    style: {
      ...bilingualTextSchema,
      description: "A concise description of the overall visual style.",
    },
    colors: {
      type: Type.ARRAY,
      items: colorKeywordSchema,
      description:
        "Three to six short color keywords, each with English, Traditional Chinese, and an approximate #RRGGBB hex color code.",
    },
    mood: {
      type: Type.ARRAY,
      items: bilingualTextSchema,
      description:
        "Three to five short mood or atmosphere keywords, each with English and Traditional Chinese.",
    },
    layout: {
      ...bilingualTextSchema,
      description: "How the page/image is arranged spatially.",
    },
    lighting: {
      ...bilingualTextSchema,
      description: "The lighting quality, direction, and contrast.",
    },
    composition: {
      ...bilingualTextSchema,
      description: "Subject placement, depth, framing, and visual hierarchy.",
    },
    promptSummary: {
      ...bilingualTextSchema,
      description: "A compact reusable prompt-style summary for designers.",
    },
  },
  required: [
    "style",
    "colors",
    "mood",
    "layout",
    "lighting",
    "composition",
    "promptSummary",
  ],
};

const prompt = `Analyze this image for a designer building a website or visual system.

Return only JSON matching the schema. Be specific but concise. Avoid identifying private people.
Every field must be bilingual:
- en: natural English
- zh: Traditional Chinese, suitable for Hong Kong readers
Focus on:
- visual style
- color palette as short keyword chips with approximate #RRGGBB hex codes
- mood and atmosphere as short keyword chips
- layout and spatial structure
- lighting
- composition
- one reusable prompt summary`;

export async function analyzeImageWithGemini({
  base64,
  mimeType,
}: {
  base64: string;
  mimeType: string;
}): Promise<StyleAnalysis> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("missing_api_key");
  }

  const client = new GoogleGenAI({ apiKey });
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  const result = await client.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              data: base64,
              mimeType,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const rawText = result.text;
  if (!rawText) {
    throw new Error("empty_gemini_response");
  }

  return normalizeAnalysis(JSON.parse(rawText));
}

function normalizeAnalysis(value: unknown): StyleAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error("invalid_gemini_response");
  }

  const record = value as Partial<StyleAnalysis>;

  return {
    style: requireBilingualText(record.style, "style"),
    colors: requireColorKeywordArray(record.colors, "colors"),
    mood: requireBilingualTextArray(record.mood, "mood"),
    layout: requireBilingualText(record.layout, "layout"),
    lighting: requireBilingualText(record.lighting, "lighting"),
    composition: requireBilingualText(record.composition, "composition"),
    promptSummary: requireBilingualText(record.promptSummary, "promptSummary"),
  };
}

function requireBilingualText(value: unknown, key: string): BilingualText {
  if (!value || typeof value !== "object") {
    throw new Error(`invalid_${key}`);
  }

  const record = value as Partial<BilingualText>;

  return {
    en: requireString(record.en, `${key}_en`),
    zh: requireString(record.zh, `${key}_zh`),
  };
}

function requireBilingualTextArray(value: unknown, key: string): BilingualText[] {
  if (!Array.isArray(value)) {
    throw new Error(`invalid_${key}`);
  }

  const items = value
    .map((item, index) => requireBilingualText(item, `${key}_${index}`))
    .filter((item) => item.en.length > 0 && item.zh.length > 0);

  if (items.length === 0) {
    throw new Error(`invalid_${key}`);
  }

  return items;
}

function requireColorKeywordArray(value: unknown, key: string): ColorKeyword[] {
  if (!Array.isArray(value)) {
    throw new Error(`invalid_${key}`);
  }

  const items = value.map((item, index) =>
    requireColorKeyword(item, `${key}_${index}`),
  );

  if (items.length === 0) {
    throw new Error(`invalid_${key}`);
  }

  return items;
}

function requireColorKeyword(value: unknown, key: string): ColorKeyword {
  const text = requireBilingualText(value, key);
  const record = value as Partial<ColorKeyword>;
  const hex = requireString(record.hex, `${key}_hex`).toUpperCase();

  if (!/^#[0-9A-F]{6}$/.test(hex)) {
    throw new Error(`invalid_${key}_hex`);
  }

  return {
    ...text,
    hex,
  };
}

function requireString(value: unknown, key: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`invalid_${key}`);
  }

  return value.trim();
}
