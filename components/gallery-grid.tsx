"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Instagram, X } from "lucide-react";
import { Container, SectionDivider } from "@/components/ui";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
import { site } from "@/lib/site";

export type InstaPost = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "CAROUSEL_ALBUM" | "VIDEO";
  media_url: string;
  thumbnail_url?: string;
  permalink: string;
  timestamp: string;
};

/** Real club photos shipped with the app so the gallery is never empty. Any
 *  images the owner uploads via /admin/gallery are shown first, then these. */
const DEFAULT_PHOTOS: InstaPost[] = [
  "court-aerial-1.jpg",
  "court-aerial-2.jpg",
  "court-night-wide.jpg",
  "court-portrait.jpg",
  "court-aerial-3.jpg",
].map((file, i) => ({
  id: `house-${i}`,
  caption: "Breathe Pickleball · Kaikhali",
  media_type: "IMAGE" as const,
  media_url: `/gallery/${file}`,
  thumbnail_url: `/gallery/${file}`,
  permalink: `/gallery/${file}`,
  timestamp: "",
}));

export function GalleryGrid({ posts }: { posts: InstaPost[] | null }) {
  // Merge owner-uploaded posts ahead of the built-in club photos, de-duped by URL.
  const uploaded = posts ?? [];
  const seen = new Set(uploaded.map((p) => p.media_url));
  const merged = [...uploaded, ...DEFAULT_PHOTOS.filter((p) => !seen.has(p.media_url))];

  return (
    <>
      {/* ── GALLERY GRID — light section ── */}
      <section className="bg-white px-4 py-16 dark:bg-[#111c38] sm:px-6 lg:px-8">
        <Container className="!px-0">
          {merged.length > 0 ? <InstaCards posts={merged} /> : <FallbackCards />}
        </Container>
      </section>
      <SectionDivider />
    </>
  );
}

function InstaCards({ posts }: { posts: InstaPost[] }) {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const close = () => setActiveIdx(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (activeIdx === null) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") setActiveIdx((i) => (i! === 0 ? posts.length - 1 : i! - 1));
      if (e.key === "ArrowRight") setActiveIdx((i) => (i! === posts.length - 1 ? 0 : i! + 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIdx, posts.length]);

  return (
    <>
      {/* Masonry-style grid */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3">
        {posts.map((p, i) => (
          <ScrollReveal
            key={p.id}
            delay={i * 0.04}
            direction="up"
            className="relative aspect-square overflow-hidden rounded-2xl border-2 border-ink/8 dark:border-white/10"
          >
            <motion.button
              type="button"
              onClick={() => setActiveIdx(i)}
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group relative block h-full w-full"
            >
              <Image
                src={p.thumbnail_url || p.media_url}
                alt={p.caption?.slice(0, 80) ?? "Breathe Pickleball"}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-ink/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 p-3">
                {p.caption && (
                  <span className="text-left text-xs font-semibold text-white line-clamp-2">
                    {p.caption}
                  </span>
                )}
              </div>
              {/* Lime corner tick on hover */}
              <div
                aria-hidden
                className="absolute left-0 top-0 h-1 w-8 bg-lime opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              />
            </motion.button>
          </ScrollReveal>
        ))}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {activeIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink/95 p-4 md:p-10"
            onClick={close}
          >
            {/* Close */}
            <button
              type="button"
              className="absolute right-4 top-4 z-50 rounded-full border-2 border-white/20 bg-white/5 p-2 text-white transition hover:border-lime hover:text-lime"
              onClick={close}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            {/* Prev */}
            <button
              type="button"
              className="absolute left-4 z-50 rounded-full border-2 border-white/20 bg-white/5 p-3 text-white transition hover:border-lime hover:text-lime md:left-8"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => (i! === 0 ? posts.length - 1 : i! - 1));
              }}
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {/* Next */}
            <button
              type="button"
              className="absolute right-4 z-50 rounded-full border-2 border-white/20 bg-white/5 p-3 text-white transition hover:border-lime hover:text-lime md:right-8"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => (i! === posts.length - 1 ? 0 : i! + 1));
              }}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>

            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.28 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border-2 border-white/15 bg-[#111c38]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Tape accent */}
              <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-80" />
              <div className="relative aspect-square">
                <Image
                  src={posts[activeIdx].media_url}
                  alt={posts[activeIdx].caption?.slice(0, 80) ?? "Breathe Pickleball"}
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  className="object-contain"
                  unoptimized
                />
              </div>
              {(posts[activeIdx].caption ||
                !posts[activeIdx].permalink.includes("blob.vercel-storage.com")) && (
                <div className="p-5 text-sm text-white/90">
                  {posts[activeIdx].caption && (
                    <p className="line-clamp-4">{posts[activeIdx].caption}</p>
                  )}
                  {!posts[activeIdx].permalink.includes("blob.vercel-storage.com") &&
                    posts[activeIdx].permalink !== posts[activeIdx].media_url && (
                      <a
                        href={posts[activeIdx].permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-accent mt-3 inline-flex text-xs"
                      >
                        <Instagram className="h-3.5 w-3.5" /> View on Instagram ↗
                      </a>
                    )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function FallbackCards() {
  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-ink/10 bg-ink dark:border-white/10">
      <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />
      <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-[0.07]" />
      <div className="relative flex flex-col items-center gap-5 px-6 py-16 text-center sm:py-20">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-lime/15">
          <Instagram className="h-8 w-8 text-lime" />
        </span>
        <div>
          <span className="eyebrow text-lime justify-center">Gallery</span>
          <h3 className="heading-lg mt-3 text-white" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
            Match-day photos are on the way
          </h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/65">
            We&apos;re putting together a gallery of rallies, tournaments, and community sessions at the club.
            In the meantime, catch all the latest on our Instagram.
          </p>
        </div>
        <a
          href={site.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-accent"
        >
          <Instagram className="h-4 w-4" /> @breathepickleball
        </a>
      </div>
    </div>
  );
}
