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

const FALLBACK = [
  { label: "Floodlit evening rally", gradient: "from-brand-900 to-brand-700" },
  { label: "Junior academy", gradient: "from-emerald-800 to-brand-700" },
  { label: "Open tournament", gradient: "from-amber-800 to-brand-800" },
  { label: "Community doubles", gradient: "from-brand-700 to-purple-800" },
  { label: "Coaching drills", gradient: "from-brand-800 to-cyan-800" },
  { label: "Weekend ladder", gradient: "from-rose-800 to-brand-800" },
  { label: "Prize night", gradient: "from-amber-700 to-rose-800" },
  { label: "Morning practice", gradient: "from-brand-600 to-cyan-700" },
  { label: "Net play mastery", gradient: "from-brand-800 to-indigo-800" },
  { label: "Mixed doubles social", gradient: "from-teal-700 to-brand-700" },
  { label: "Beginner clinic", gradient: "from-fuchsia-800 to-brand-800" },
  { label: "Match point", gradient: "from-brand-700 to-amber-700" },
];

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
              {posts[activeIdx].caption && (
                <div className="p-5 text-sm text-white/90">
                  <p className="line-clamp-4">{posts[activeIdx].caption}</p>
                  <a
                    href={posts[activeIdx].permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-lime px-4 py-2 text-xs font-bold text-gray-900 hover:bg-lime-dark"
                  >
                    <Instagram className="h-3.5 w-3.5" /> View on Instagram ↗
                  </a>
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
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-3">
      {FALLBACK.map((item, i) => (
        <ScrollReveal key={item.label} delay={i * 0.04} direction="up" className="relative aspect-square overflow-hidden rounded-2xl border border-brand/5 shadow-soft">
          <motion.div whileHover={{ scale: 1.03 }} className={`group relative h-full w-full bg-gradient-to-br ${item.gradient}`}>
            <CourtPatternBg className="absolute inset-0 h-full w-full object-cover opacity-15" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
              <CourtLineLogo />
              <span className="line-clamp-2 text-sm font-bold leading-tight text-white">{item.label}</span>
            </div>
          </motion.div>
        </ScrollReveal>
      ))}
      <ScrollReveal delay={FALLBACK.length * 0.04} direction="up" className="relative aspect-square overflow-hidden rounded-2xl border border-brand/5 shadow-soft sm:col-span-2 md:col-span-1">
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-gradient-to-br from-pink-600 via-purple-700 to-brand-800 p-4 text-center">
          <Instagram className="h-10 w-10 text-white" />
          <p className="text-sm font-bold text-white">Follow @breathepickleball on Instagram</p>
          <a
            href={site.instagram}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-purple-800 transition hover:bg-gray-100"
          >
            Follow now
          </a>
        </div>
      </ScrollReveal>
    </div>
  );
}

function CourtLineLogo() {
  return (
    <svg viewBox="0 0 80 80" className="h-12 w-12 text-white/60" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="8" y="14" width="64" height="52" rx="2" />
      <line x1="8" y1="40" x2="72" y2="40" strokeWidth="2" />
      <line x1="8" y1="30" x2="72" y2="30" strokeDasharray="3 3" />
      <line x1="8" y1="50" x2="72" y2="50" strokeDasharray="3 3" />
      <line x1="40" y1="14" x2="40" y2="30" />
      <line x1="40" y1="50" x2="40" y2="66" />
    </svg>
  );
}
