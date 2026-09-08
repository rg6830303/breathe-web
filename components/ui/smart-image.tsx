"use client";

import Image from "next/image";
import { useState } from "react";
import type { Photo } from "@/lib/photos";

/**
 * next/image wrapper that degrades gracefully. If a photo file isn't on disk
 * yet (e.g. the owner hasn't dropped in the community shots), the <img> would
 * normally 404 into a broken-image icon. Instead we catch the error and paint
 * an on-brand "court" placeholder so every layout still looks intentional.
 *
 * Always renders with `fill`, so the PARENT must be `relative` + sized.
 */
export function SmartImage({
  photo,
  sizes,
  priority = false,
  className = "",
  imgClassName = "",
}: {
  photo: Photo;
  sizes?: string;
  priority?: boolean;
  className?: string;
  /** Extra classes for the <img> itself (object-position, scale, etc.). */
  imgClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`relative h-full w-full overflow-hidden bg-ink ${className}`}>
      {failed ? (
        <Placeholder label={photo.alt} />
      ) : (
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes ?? "(max-width: 768px) 100vw, 50vw"}
          priority={priority}
          onError={() => setFailed(true)}
          className={`object-cover ${imgClassName}`}
        />
      )}
    </div>
  );
}

/** Pure-CSS court placeholder — brand gradient, court lines, a lime ball. */
function Placeholder({ label }: { label: string }) {
  return (
    <div
      aria-label={label}
      role="img"
      className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(120%_100%_at_50%_-10%,#1b2c63_0%,#0b1530_60%,#070d22_100%)]"
    >
      <div className="court-lines absolute inset-0 opacity-[0.12]" />
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-70" />
      <div className="relative flex flex-col items-center gap-3 px-6 text-center">
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-lime shadow-[0_0_28px_rgba(198,244,50,0.5)]">
          <span className="absolute inset-0 rounded-full ring-2 ring-lime/40 animate-glow-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-ink/50" />
        </span>
        <span className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/45">
          Breathe Pickleball
        </span>
      </div>
    </div>
  );
}
