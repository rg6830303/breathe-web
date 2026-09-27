"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, Loader2, X } from "lucide-react";

type Props = {
  url: string;
  /** Entrant name — used for the modal title and the downloaded filename. */
  name: string;
  onClose: () => void;
};

/** date/time + random suffix — never the entrant's raw email or phone. */
function safeFilename(name: string, url: string) {
  const ext = /^data:image\/(\w+)/.exec(url)?.[1] ?? url.split(".").pop()?.split("?")[0] ?? "jpg";
  const slug = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "entry-photo";
  return `${slug}.${ext === "jpeg" ? "jpg" : ext}`;
}

/**
 * Full-size view of one entrant's profile photo, with a real download.
 *
 * Photos are stored either as a Vercel Blob URL (hosted) or, when no Blob
 * store is attached, as an inline base64 data: URL — see
 * app/api/tournaments/register/photo/route.ts. Both need a different download
 * path: a data: URL becomes a Blob directly; a hosted URL is fetched first so
 * the browser saves a file instead of just navigating to the image. If the
 * fetch is blocked by CORS, the fallback opens the original URL in a new tab
 * so the photo is never unreachable, just not auto-downloaded.
 */
export function PhotoLightbox({ url, name, onClose }: Props) {
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function download() {
    setDownloading(true);
    setDownloadError(false);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = safeFilename(name, url);
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // Cross-origin fetch blocked, or the host is offline — open it instead.
      setDownloadError(true);
      window.open(url, "_blank", "noopener,noreferrer");
    } finally {
      setDownloading(false);
    }
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${name}'s profile photo`}
    >
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#111c38]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink/10 px-4 py-3 dark:border-white/10">
          <h3 className="truncate font-display text-sm font-extrabold text-ink dark:text-white">{name}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink dark:text-white/50 dark:hover:bg-white/10 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex max-h-[70vh] items-center justify-center bg-ink/5 p-2 dark:bg-black/30">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`${name}'s profile photo`} className="max-h-[65vh] w-auto rounded-lg object-contain" />
        </div>

        <div className="flex items-center justify-between gap-3 border-t-2 border-ink/10 px-4 py-3 dark:border-white/10">
          {downloadError ? (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              Couldn&apos;t download directly — opened the photo in a new tab instead.
            </p>
          ) : (
            <span />
          )}
          <div className="flex shrink-0 gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline px-3 py-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            <button type="button" onClick={download} disabled={downloading} className="btn-primary px-3 py-1.5 text-xs">
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              Download
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
