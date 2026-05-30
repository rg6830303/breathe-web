"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Zap,
  GraduationCap,
  Trophy,
  Users,
  Target,
  BarChart2,
  Star,
  Sun,
  Activity,
  Heart,
  Lightbulb,
  Crosshair,
  Camera,
  Instagram,
  X,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PageHero } from "@/components/ui/page-hero";
import { Container, CTABand, SectionDivider } from "@/components/ui";
import { ScrollReveal } from "@/components/motion/scroll-reveal";
import { CourtPatternBg } from "@/components/ui/court-pattern-bg";
import { site } from "@/lib/site";

const galleryItems = [
  { label: 'Floodlit Evening Rallies', gradient: 'from-brand-900 to-brand-700', icon: 'Zap', aspect: 'tall' },
  { label: 'Junior Academy in Action', gradient: 'from-emerald-800 to-brand-700', icon: 'GraduationCap', aspect: 'wide' },
  { label: 'Open Tournament Finals', gradient: 'from-amber-800 to-brand-800', icon: 'Trophy', aspect: 'square' },
  { label: 'Courtside Community', gradient: 'from-brand-700 to-purple-800', icon: 'Users', aspect: 'wide' },
  { label: 'Coaching Drills', gradient: 'from-brand-800 to-cyan-800', icon: 'Target', aspect: 'square' },
  { label: 'Weekend Doubles Ladder', gradient: 'from-rose-800 to-brand-800', icon: 'BarChart2', aspect: 'tall' },
  { label: 'Prize Night Celebrations', gradient: 'from-amber-700 to-rose-800', icon: 'Star', aspect: 'wide' },
  { label: 'Morning Practice', gradient: 'from-brand-600 to-cyan-700', icon: 'Sun', aspect: 'square' },
  { label: 'Net Play Mastery', gradient: 'from-brand-800 to-indigo-800', icon: 'Activity', aspect: 'square' },
  { label: 'Beginner Batches', gradient: 'from-green-800 to-brand-700', icon: 'Heart', aspect: 'wide' },
  { label: 'Court 3 Spotlight', gradient: 'from-brand-700 to-blue-900', icon: 'Lightbulb', aspect: 'tall' },
  { label: 'Match Point', gradient: 'from-red-800 to-brand-800', icon: 'Crosshair', aspect: 'square' },
];

const iconMap: Record<string, React.ComponentType<any>> = {
  Zap,
  GraduationCap,
  Trophy,
  Users,
  Target,
  BarChart2,
  Star,
  Sun,
  Activity,
  Heart,
  Lightbulb,
  Crosshair
};

export default function GalleryPage() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  const openLightbox = (idx: number) => {
    setActiveIdx(idx);
  };

  const closeLightbox = () => {
    setActiveIdx(null);
  };

  const showPrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeIdx !== null) {
      setActiveIdx((prev) => (prev === 0 ? galleryItems.length - 1 : prev! - 1));
    }
  };

  const showNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activeIdx !== null) {
      setActiveIdx((prev) => (prev === galleryItems.length - 1 ? 0 : prev! + 1));
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeIdx === null) return;
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowLeft") showPrev();
      if (e.key === "ArrowRight") showNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIdx]);

  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        {/* Dark Hero */}
        <PageHero
          dark={true}
          label="Gallery"
          title="Life at Breathe Pickleball"
          subtitle="From first serves to championship points, here's a glimpse of the energy on our courts. For the latest photos and reels, follow us on Instagram."
        />

        {/* Masonry gallery section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
          <Container className="!px-0">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 auto-rows-[160px] md:auto-rows-[180px] lg:auto-rows-[200px]">
              {galleryItems.map((item, idx) => {
                const Icon = iconMap[item.icon];
                const spanClass = `
                  ${item.aspect === "tall" ? "md:row-span-2" : ""}
                  ${item.aspect === "wide" ? "md:col-span-2" : ""}
                `;
                return (
                  <ScrollReveal
                    key={item.label}
                    delay={idx * 0.05}
                    direction="up"
                    className={`relative overflow-hidden rounded-2xl cursor-pointer shadow-soft border border-brand/5 ${spanClass}`}
                  >
                    <motion.div
                      onClick={() => openLightbox(idx)}
                      className={`relative w-full h-full bg-gradient-to-br ${item.gradient} p-5 flex flex-col justify-between group`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Court line SVG watermark */}
                      <CourtPatternBg className="absolute inset-0 opacity-10 pointer-events-none w-full h-full object-cover" />

                      {/* Icon & Label Center Layout */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                        {Icon && <Icon className="w-10 h-10 text-white/40 group-hover:scale-110 transition-transform duration-300" />}
                        <span className="text-white text-xs md:text-sm font-bold text-center px-2">{item.label}</span>
                      </div>

                      {/* Hover overlay */}
                      <motion.div
                        className="absolute inset-0 bg-white/5 pointer-events-none"
                        initial={{ opacity: 0 }}
                        whileHover={{ opacity: 1 }}
                      />

                      {/* Bottom left label */}
                      <div className="absolute bottom-3 left-3 text-[9px] text-white/35 font-mono">
                        Photo coming soon
                      </div>
                    </motion.div>
                  </ScrollReveal>
                );
              })}
            </div>
          </Container>
        </section>

        <SectionDivider />

        {/* Instagram CTA Section */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-brand-50/20">
          <Container className="!px-0">
            <ScrollReveal direction="up">
              <div className="bg-gradient-to-r from-purple-800 via-pink-700 to-amber-600 rounded-3xl p-8 text-center text-white shadow-glow">
                <div className="relative max-w-xl mx-auto flex flex-col items-center gap-4">
                  <Instagram className="h-8 w-8 text-white" />
                  <h2 className="font-display text-xl md:text-2xl font-extrabold">Tag us @breathepickleball</h2>
                  <p className="text-xs md:text-sm text-white/80 leading-relaxed">
                    We love resharing our community's best moments. Follow and tag us on Instagram to get featured.
                  </p>
                  
                  <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="mt-2">
                    <a
                      href={site.instagram}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3 text-xs md:text-sm font-bold text-pink-700 shadow-soft hover:bg-gray-50 transition-colors"
                    >
                      Follow on Instagram
                    </a>
                  </motion.div>
                </div>
              </div>
            </ScrollReveal>
          </Container>
        </section>

        <SectionDivider />

        {/* Custom full screen Lightbox overlay */}
        <AnimatePresence>
          {activeIdx !== null && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 md:p-10"
              onClick={closeLightbox}
            >
              {/* Close Button */}
              <button
                className="absolute top-6 right-6 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-full z-50 transition-all active:scale-95"
                onClick={closeLightbox}
                aria-label="Close Lightbox"
              >
                <X className="w-6 h-6" />
              </button>

              {/* Prev Button */}
              <button
                className="absolute left-4 md:left-8 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-full z-50 transition-all active:scale-95"
                onClick={showPrev}
                aria-label="Previous Slide"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>

              {/* Next Button */}
              <button
                className="absolute right-4 md:right-8 text-white/70 hover:text-white bg-white/5 hover:bg-white/10 p-3 rounded-full z-50 transition-all active:scale-95"
                onClick={showNext}
                aria-label="Next Slide"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Slide content wrapper */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className={`relative w-full max-w-2xl aspect-[4/3] rounded-3xl bg-gradient-to-br ${galleryItems[activeIdx].gradient} p-8 flex flex-col justify-between shadow-glow overflow-hidden`}
                onClick={(e) => e.stopPropagation()} // Prevent closing lightbox when clicking inside card
              >
                <CourtPatternBg className="absolute inset-0 opacity-15 pointer-events-none w-full h-full object-cover" />

                <div className="relative h-full flex flex-col items-center justify-center gap-6">
                  {(() => {
                    const ActiveIcon = iconMap[galleryItems[activeIdx].icon];
                    return ActiveIcon ? <ActiveIcon className="w-20 h-20 text-white/50 animate-pulse" /> : null;
                  })()}
                  <h3 className="text-white text-2xl md:text-3xl font-extrabold text-center max-w-lg leading-tight">
                    {galleryItems[activeIdx].label}
                  </h3>
                </div>

                <div className="relative text-center text-white/40 text-xs font-mono">
                  Breathe Pickleball · Kolkata
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
