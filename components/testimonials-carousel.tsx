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
    <div className="mt-12">
      {/* Mobile view: Auto-scrolling carousel */}
      <div className="block md:hidden relative overflow-hidden px-2 py-4">
        <div className="min-h-[220px] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4 border border-brand/5"
            >
              <div className="flex gap-1 text-amber">{"★".repeat(5)}</div>
              <p className="text-gray-755 italic text-sm leading-relaxed">
                &ldquo;{testimonials[index].quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm">
                  {initialsFor(testimonials[index].name)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">
                    {testimonials[index].name}
                  </div>
                  <div className="text-xs text-gray-500">
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
              className={`h-2 w-2 rounded-full transition-all duration-300 ${
                index === i ? "bg-brand w-4" : "bg-brand/20"
              }`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop view: 3-column grid */}
      <div className="hidden md:grid gap-6 md:grid-cols-3">
        {testimonials.map((t, idx) => (
          <ScrollReveal key={t.name} delay={idx * 0.15} direction="up">
            <div className="h-full rounded-2xl bg-white shadow-md p-6 flex flex-col gap-4 border border-brand/5 transition-all hover:shadow-card hover:-translate-y-1">
              <div className="flex gap-1 text-amber">{"★".repeat(5)}</div>
              <p className="text-gray-700 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-auto flex items-center gap-3 pt-4 border-t border-gray-50">
                <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                  {initialsFor(t.name)}
                </div>
                <div>
                  <div className="font-semibold text-gray-900">{t.name}</div>
                  <div className="text-xs text-gray-500">{t.memberType}</div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </div>
  );
}
