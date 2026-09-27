"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, X } from "lucide-react";

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
 * The download MUST happen synchronously inside the click handler — no
 * `await` before the anchor is clicked. An earlier version did
 * `await fetch(url)` first to build a blob: URL, and that gap between the tap
 * and the actual DOM action breaks the browser's "this came from a trusted
 * user gesture" chain. Once broken, an installed/PWA admin console can treat
 * the resulting action as a real navigation rather than a download — which is
 * what was knocking the console out of its window and back to the login
 * screen. `target="_blank" rel="noopener noreferrer"` is the hard guarantee
 * underneath that: whatever the browser decides to do with the URL, it
 * happens in a separate tab/context, so the admin tab and its session are
 * never touched, whether or not the `download` attribute is honoured.
 *
 * Photos are stored either as a Vercel Blob URL (hosted) or, when no Blob
 * store is attached, as an inline base64 data: URL — see
 * app/api/tournaments/register/photo/route.ts. Both work with a plain anchor.
 */
export function PhotoLightbox({ url, name, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
          <p className="text-[11px] text-ink/40 dark:text-white/35">Opens in a new tab — this page stays open.</p>
          <div className="flex shrink-0 gap-2">
            <a href={url} target="_blank" rel="noopener noreferrer" className="btn-outline px-3 py-1.5 text-xs">
              <ExternalLink className="h-3.5 w-3.5" /> Open
            </a>
            {/* Plain anchor, no JS in between: whatever the browser does with
                this — save it, or just display it — happens in the new tab
                the `target` opens, never in the admin console itself. */}
            <a
              href={url}
              download={safeFilename(name, url)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary px-3 py-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </a>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
