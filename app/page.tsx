"use client";

import {
  AlertCircle,
  CheckCircle2,
  ImageUp,
  Loader2,
  Palette,
  RotateCcw,
  Sparkles,
  SunMedium,
  Upload,
} from "lucide-react";
import { ChangeEvent, DragEvent, useEffect, useMemo, useState } from "react";

type StyleAnalysis = {
  style: BilingualText;
  colors: BilingualText[];
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

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<StyleAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const fileSize = useMemo(() => {
    if (!file) {
      return "";
    }

    return `${(file.size / (1024 * 1024)).toFixed(2)} MB`;
  }, [file]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(nextFile: File | undefined) {
    setError(null);
    setAnalysis(null);

    if (!nextFile) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(nextFile.type)) {
      setFile(null);
      setError("Only JPEG, PNG, and WebP images are supported.");
      return;
    }

    if (nextFile.size > MAX_IMAGE_BYTES) {
      setFile(null);
      setError("Image is too large. Please upload an image under 8MB.");
      return;
    }

    setFile(nextFile);
  }

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    selectFile(event.target.files?.[0]);
    event.target.value = "";
  }

  function onDragOver(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function onDragLeave() {
    setIsDragging(false);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function analyzeImage() {
    if (!file) {
      setError("Please choose an image first.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const formData = new FormData();
      formData.append("image", file);

      const response = await fetch("/api/analyze-image", {
        method: "POST",
        body: formData,
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || "The image could not be analyzed.");
      }

      setAnalysis(payload);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The image could not be analyzed.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setAnalysis(null);
    setError(null);
  }

  return (
    <main className="shell">
      <section className="workspace">
        <div className="intro">
          <h1>PicTone</h1>
          <p>
            Drop in a visual and get a bilingual Gemini read on its style,
            palette, atmosphere, and layout without storing the image.
          </p>
        </div>

        <section className="panel upload-panel" aria-label="Image upload">
          <label
            className={`dropzone${isDragging ? " is-dragging" : ""}`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          >
            <input
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              onChange={onFileChange}
              aria-label="Upload image"
            />

            {previewUrl && file ? (
              <div className="drop-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="Uploaded preview" />
                <div className="preview-meta">
                  <strong>{file.name}</strong>
                  <span>{fileSize}</span>
                </div>
              </div>
            ) : (
              <div className="drop-empty">
                <div>
                  <span className="upload-icon">
                    <ImageUp size={28} aria-hidden="true" />
                  </span>
                  <h2>Drop an image here</h2>
                  <p>JPEG, PNG, or WebP. The image is only used for this request.</p>
                </div>
              </div>
            )}
          </label>

          <div className="actions">
            <button
              className="secondary"
              type="button"
              onClick={reset}
              disabled={!file || isLoading}
            >
              <RotateCcw size={18} aria-hidden="true" />
              Reset
            </button>
            <button
              className="primary"
              type="button"
              onClick={analyzeImage}
              disabled={!file || isLoading}
            >
              {isLoading ? (
                <Loader2 size={18} aria-hidden="true" />
              ) : (
                <Upload size={18} aria-hidden="true" />
              )}
              Analyze image
            </button>
          </div>

          {error ? (
            <div className="error" role="alert">
              <AlertCircle size={20} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}
        </section>

        <section className="panel results-panel" aria-label="Style analysis">
          <div className="panel-title">
            <h2>Analysis</h2>
            <span className="status-pill">
              <CheckCircle2 size={16} aria-hidden="true" />
              No storage
            </span>
          </div>

          {isLoading ? (
            <div className="loading-state">
              <div>
                <Loader2 size={32} aria-hidden="true" />
                <p>Reading the visual language...</p>
              </div>
            </div>
          ) : analysis ? (
            <div className="result-grid">
              <ResultItem icon={<Sparkles size={16} />} label="Style">
                <BilingualValue value={analysis.style} />
              </ResultItem>

              <ResultItem icon={<Palette size={16} />} label="Colors">
                <ChipList items={analysis.colors} />
              </ResultItem>

              <ResultItem icon={<SunMedium size={16} />} label="Mood">
                <ChipList items={analysis.mood} />
              </ResultItem>

              <ResultItem label="Lighting">
                <BilingualValue value={analysis.lighting} />
              </ResultItem>

              <ResultItem label="Layout" full>
                <BilingualValue value={analysis.layout} />
              </ResultItem>

              <ResultItem label="Composition" full>
                <BilingualValue value={analysis.composition} />
              </ResultItem>

              <ResultItem label="Prompt summary" full>
                <BilingualValue value={analysis.promptSummary} />
              </ResultItem>
            </div>
          ) : (
            <div className="empty-state">
              <p>
                Your structured result will appear here after Gemini analyzes the
                uploaded image.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

function ResultItem({
  children,
  full = false,
  icon,
  label,
}: {
  children: React.ReactNode;
  full?: boolean;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <div className={`result-item${full ? " full" : ""}`}>
      <div className="result-label">
        {icon}
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}

function BilingualValue({ value }: { value: BilingualText }) {
  return (
    <div className="bilingual-value">
      <p className="result-value">{value.en}</p>
      <p className="result-value zh">{value.zh}</p>
    </div>
  );
}

function ChipList({ items }: { items: BilingualText[] }) {
  return (
    <div className="chips">
      {items.map((item) => (
        <span className="chip keyword-chip" key={`${item.en}-${item.zh}`}>
          <span className="keyword-text">{item.en}</span>
          <span className="keyword-divider" aria-hidden="true" />
          <span className="keyword-text zh">{item.zh}</span>
        </span>
      ))}
    </div>
  );
}
