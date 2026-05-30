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
  {
    id: 1,
    label: "Floodlit Evening Rallies",
    caption: "Under the lights at Kaikhali! There's nothing like a fast-paced evening rally under our professional tournament floodlights. 🏓⚡ Book your court tonight!",
    gradient: "from-brand-900 to-brand-700",
    icon: "Zap",
    likes: 124,
    comments: 12,
    date: "2 hours ago",
    type: "image"
  },
  {
    id: 2,
    label: "Junior Academy in Action",
    caption: "Tomorrow's champions are training hard today! 🌟 Our Junior Academy is back on court focusing on baseline footwork and dink accuracy. 🎓👶",
    gradient: "from-emerald-800 to-brand-700",
    icon: "GraduationCap",
    likes: 248,
    comments: 31,
    date: "5 hours ago",
    type: "carousel"
  },
  {
    id: 3,
    label: "Open Tournament Finals",
    caption: "The atmosphere was absolute electric during the Breathe Open Doubles final! 🏆 Congratulations to the winners who took home the cash prize! 💥",
    gradient: "from-amber-800 to-brand-800",
    icon: "Trophy",
    likes: 312,
    comments: 42,
    date: "1 day ago",
    type: "video"
  },
  {
    id: 4,
    label: "Courtside Community",
    caption: "Rallies over egos. Breathe is where Kolkata's community meets to connect, reset, and celebrate together off the court! ☕🍔 #PickleballIndia",
    gradient: "from-brand-700 to-purple-800",
    icon: "Users",
    likes: 156,
    comments: 8,
    date: "2 days ago",
    type: "image"
  },
  {
    id: 5,
    label: "Coaching Drills",
    caption: "Focusing on that third-shot drop strategy. Our certified coaches provide structured training to elevate your game at every skill tier! 🎯📈",
    gradient: "from-brand-800 to-cyan-800",
    icon: "Target",
    likes: 98,
    comments: 6,
    date: "3 days ago",
    type: "image"
  },
  {
    id: 6,
    label: "Weekend Doubles Ladder",
    caption: "Saturday Ladder is locked and loaded! Full venue occupancy and intense competitive matches across all 3 courts. Check the scoreboard! 📊🔥",
    gradient: "from-rose-800 to-brand-800",
    icon: "BarChart2",
    likes: 184,
    comments: 15,
    date: "4 days ago",
    type: "carousel"
  },
  {
    id: 7,
    label: "Prize Night Celebrations",
    caption: "Celebrating the community under the stars! A perfect ending to our Monthly Open with prize-giving ceremonies, food, and endless smiles! ⭐🏆",
    gradient: "from-amber-700 to-rose-800",
    icon: "Star",
    likes: 275,
    comments: 24,
    date: "5 days ago",
    type: "image"
  },
  {
    id: 8,
    label: "Morning Practice",
    caption: "Rise and dink! Start your morning with positive energy and good rallies under the fresh breeze. 🌅🏓 We open daily at 6:00 AM!",
    gradient: "from-brand-600 to-cyan-700",
    icon: "Sun",
    likes: 110,
    comments: 4,
    date: "1 week ago",
    type: "image"
  },
  {
    id: 9,
    label: "Net Play Mastery",
    caption: "Mastering the kitchen dinks. Quick reflexes and sharp kitchen control are what wins pickleball double matches! ⚡💪 #KitchenControl",
    gradient: "from-brand-800 to-indigo-800",
    icon: "Activity",
    likes: 135,
    comments: 11,
    date: "1 week ago",
    type: "video"
  }
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

        {/* Responsive Instagram Grid */}
        <section className="px-4 py-16 sm:px-6 lg:px-8 bg-white">
          <Container className="!px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {galleryItems.map((item, idx) => {
                const Icon = iconMap[item.icon];
                return (
                  <ScrollReveal
                    key={item.id}
                    delay={idx * 0.05}
                    direction="up"
                    className="relative overflow-hidden rounded-2xl cursor-pointer shadow-soft border border-brand/5 aspect-square"
                  >
                    <motion.div
                      onClick={() => openLightbox(idx)}
                      className={`relative w-full h-full bg-gradient-to-br ${item.gradient} flex flex-col justify-between group`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {/* Court line SVG watermark */}
                      <CourtPatternBg className="absolute inset-0 opacity-10 pointer-events-none w-full h-full object-cover" />

                      {/* Icon & Title Layout */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
                        {Icon && <Icon className="w-12 h-12 text-white/40 group-hover:scale-110 transition-transform duration-300" />}
                        <span className="text-white text-sm font-bold text-center px-4 leading-tight">{item.label}</span>
                      </div>

                      {/* Dark blurred Instagram hover overlay */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-[4px] opacity-0 group-hover:opacity-100 transition-all duration-300 p-6 text-center select-none z-10">
                        <div className="text-white font-display font-extrabold flex items-center justify-center gap-6 text-base">
                          <span className="flex items-center gap-1.5 hover:scale-105 transition">
                            ❤️ {item.likes}
                          </span>
                          <span className="flex items-center gap-1.5 hover:scale-105 transition">
                            💬 {item.comments}
                          </span>
                        </div>
                        <div className="mt-4 text-[10px] text-lime font-bold uppercase tracking-widest flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-lime/30 bg-lime/5">
                          View on Instagram ↗
                        </div>
                      </div>

                      {/* Top right type tag (carousel, video etc) */}
                      <div className="absolute top-3 right-3 text-[10px] text-white/40 font-semibold bg-black/20 px-2.5 py-1 rounded-full backdrop-blur-sm">
                        {item.type === "video" ? "📹 Reel" : item.type === "carousel" ? "📁 Carousel" : "📸 Post"}
                      </div>

                      {/* Bottom left label */}
                      <div className="absolute bottom-3 left-3 text-[9px] text-white/30 font-mono">
                        {item.date}
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

              {/* Detail Card Overlay split panel */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="relative w-full max-w-3xl rounded-3xl bg-gray-900 border border-white/10 shadow-glow overflow-hidden grid md:grid-cols-2 aspect-auto"
                onClick={(e) => e.stopPropagation()} // Prevent closing lightbox when clicking inside card
              >
                {/* Left Side: Dynamic visual tile */}
                <div className={`relative w-full aspect-square md:aspect-auto md:h-full bg-gradient-to-br ${galleryItems[activeIdx].gradient} p-8 flex flex-col justify-between min-h-[250px]`}>
                  <CourtPatternBg className="absolute inset-0 opacity-20 pointer-events-none w-full h-full object-cover" />
                  <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
                    {(() => {
                      const ActiveIcon = iconMap[galleryItems[activeIdx].icon];
                      return ActiveIcon ? <ActiveIcon className="w-5 h-5 text-white" /> : null;
                    })()}
                  </div>
                  <div className="relative mt-20 flex flex-col gap-2">
                    <span className="text-[10px] text-lime font-bold uppercase tracking-widest">
                      {galleryItems[activeIdx].type === "video" ? "📹 Reel" : galleryItems[activeIdx].type === "carousel" ? "📁 Carousel" : "📸 Post"}
                    </span>
                    <h3 className="text-white text-xl md:text-2xl font-extrabold leading-tight">
                      {galleryItems[activeIdx].label}
                    </h3>
                  </div>
                </div>

                {/* Right Side: Instagram Details */}
                <div className="p-6 sm:p-8 flex flex-col justify-between bg-[#0D1426] border-t md:border-t-0 md:border-l border-white/10">
                  <div className="flex flex-col gap-4">
                    {/* Channel / Logo Header */}
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-white tracking-wider">
                        BP
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">breathepickleball</div>
                        <div className="text-[10px] text-gray-500">Kaikhali, Kolkata</div>
                      </div>
                    </div>
                    
                    <hr className="border-white/5 my-1" />

                    {/* Caption */}
                    <p className="text-gray-300 text-xs sm:text-sm leading-relaxed font-sans mt-2">
                      {galleryItems[activeIdx].caption}
                    </p>
                  </div>

                  <div className="mt-6">
                    <hr className="border-white/5 my-2" />
                    
                    {/* Likes, Comments & Date */}
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <div className="flex items-center gap-4 text-xs font-bold">
                        <span>❤️ {galleryItems[activeIdx].likes} likes</span>
                        <span>💬 {galleryItems[activeIdx].comments} comments</span>
                      </div>
                      <span className="text-[9px] text-gray-500 font-mono">{galleryItems[activeIdx].date}</span>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <a
                        href={site.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-[#D4FC34] px-4 py-2.5 text-xs font-bold text-gray-950 shadow-soft hover:bg-lime-dark transition"
                      >
                        <Instagram className="h-3.5 w-3.5" /> View Post on Instagram
                      </a>
                    </div>
                  </div>
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
