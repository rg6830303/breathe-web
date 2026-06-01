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

export function GalleryGrid({ posts }: { posts: InstaPost[] | null }) {
  return (
    <>
      <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
        <Container className="!px-0">
          {posts && posts.length > 0 ? <InstaCards posts={posts} /> : <FallbackCards />}
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
      <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
        {posts.map((p, i) => (
          <ScrollReveal key={p.id} delay={i * 0.04} direction="up" className="relative aspect-square overflow-hidden rounded-2xl border border-brand/5 shadow-soft">
            <motion.button
              type="button"
              onClick={() => setActiveIdx(i)}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="group relative block h-full w-full"
            >
              <Image
                src={p.thumbnail_url || p.media_url}
                alt={p.caption?.slice(0, 80) ?? "Breathe Pickleball"}
                fill
                sizes="(max-width: 768px) 50vw, 33vw"
                className="object-cover"
                unoptimized
              />
              {p.caption && (
                <div className="absolute inset-x-0 bottom-0 translate-y-2 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-xs text-white opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <span className="line-clamp-2">{p.caption}</span>
                </div>
              )}
            </motion.button>
          </ScrollReveal>
        ))}
      </div>

      <AnimatePresence>
        {activeIdx !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 md:p-10"
            onClick={close}
          >
            <button
              type="button"
              className="absolute right-4 top-4 z-50 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              onClick={close}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute left-4 z-50 rounded-full bg-white/5 p-3 text-white hover:bg-white/10 md:left-8"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => (i! === 0 ? posts.length - 1 : i! - 1));
              }}
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-4 z-50 rounded-full bg-white/5 p-3 text-white hover:bg-white/10 md:right-8"
              onClick={(e) => {
                e.stopPropagation();
                setActiveIdx((i) => (i! === posts.length - 1 ? 0 : i! + 1));
              }}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-gray-900 shadow-glow"
              onClick={(e) => e.stopPropagation()}
            >
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
                  {posts[activeIdx].caption && <p className="line-clamp-4">{posts[activeIdx].caption}</p>}
                  {!posts[activeIdx].permalink.includes("blob.vercel-storage.com") &&
                    posts[activeIdx].permalink !== posts[activeIdx].media_url && (
                      <a
                        href={posts[activeIdx].permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-xs font-bold text-gray-900 hover:bg-lime-dark"
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
  // No uploaded photos yet — show one honest, on-brand panel that points
  // visitors to Instagram (and tells the owner to upload from /admin/gallery)
  // instead of a wall of empty placeholder boxes.
  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand/10 bg-gradient-to-br from-brand-800 via-brand-700 to-brand-900 shadow-glow">
      <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-20" />
      <div className="relative flex flex-col items-center gap-5 px-6 py-16 text-center sm:py-20">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
          <Instagram className="h-8 w-8 text-white" />
        </span>
        <div>
          <h3 className="font-display text-2xl font-extrabold text-white sm:text-3xl">Match-day photos are on the way</h3>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/80">
            We&apos;re putting together a gallery of rallies, tournaments, and coaching sessions at the club.
            In the meantime, catch all the latest on our Instagram.
          </p>
        </div>
        <a
          href={site.instagram}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 rounded-full bg-lime px-6 py-3 text-sm font-bold text-gray-900 shadow-soft transition hover:bg-lime-dark"
        >
          <Instagram className="h-4 w-4" /> @breathepickleball
        </a>
      </div>
    </div>
  );
}
