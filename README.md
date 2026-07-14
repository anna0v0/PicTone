# Vibe Lens

A Next.js tool that analyzes an uploaded image with Gemini and returns a bilingual English/Traditional Chinese description of its style, colors, mood, layout, lighting, composition, and prompt-ready summary.

Images are not stored. The browser shows a local preview, and the API route sends the image bytes to Gemini as inline base64 data for a single request.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Add your Gemini API key to `.env.local`:

```bash
GEMINI_API_KEY=your_key_here
```

The default model is `gemini-3.5-flash`. Override it with:

```bash
GEMINI_MODEL=gemini-3.5-flash
```

## Limits

- Accepted formats: JPEG, PNG, WebP
- Max image size: 8MB
- No image uploads are written to disk or a database
