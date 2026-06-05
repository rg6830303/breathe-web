"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollReveal } from "@/components/motion/scroll-reveal";

type Testimonial = {
  name: string;
  role: string;
  memberType: string;
  quote: string;
};

type Props = {
  testimonials: Testimonial[];
};

export function TestimonialsCarousel({ testimonials }: Props) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % testimonials.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [testimonials.length]);

  function initialsFor(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]!.toUpperCase())
      .join("");
  }

  return (
    <div className="mt-10">
      {/* Mobile: auto-scrolling carousel */}
      <div className="block md:hidden relative overflow-hidden px-2 py-4">
        <div className="min-h-[230px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.38, ease: "easeInOut" }}
              className="card-sport p-6 flex flex-col gap-4"
            >
              {/* Stars */}
              <div className="flex gap-0.5 text-lime text-base">{"★".repeat(5)}</div>
              <p className="text-white/80 italic text-sm leading-relaxed dark:text-white/75">
                &ldquo;{testimonials[index].quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime font-extrabold text-ink text-sm">
                  {initialsFor(testimonials[index].name)}
                </div>
                <div>
                  <div className="font-extrabold text-ink dark:text-white text-sm">
                    {testimonials[index].name}
                  </div>
                  <div className="text-xs text-slatey dark:text-white/50">
                    {testimonials[index].memberType}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Carousel indicators */}
        <div className="flex justify-center gap-2 mt-4">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === i ? "bg-lime w-5" : "bg-white/20 w-2"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid gap-5 md:grid-cols-3">
        {testimonials.map((t, idx) => (
          <ScrollReveal key={t.name} delay={idx * 0.15} direction="up">
            <div className="card-sport h-full p-6 flex flex-col gap-4 transition-all hover:-translate-y-1">
              {/* Stars */}
              <div className="flex gap-0.5 text-lime text-base">{"★".repeat(5)}</div>
              <p className="text-ink/75 italic leading-relaxed dark:text-white/70 text-sm">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="mt-auto flex items-center gap-3 border-t border-ink/8 pt-4 dark:border-white/10">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lime font-extrabold text-ink text-sm">
                  {initialsFor(t.name)}
                </div>
                <div>
                  <div className="font-extrabold text-ink dark:text-white text-sm">{t.name}</div>
                  <div className="text-xs text-slatey dark:text-white/50">{t.memberType}</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
