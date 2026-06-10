"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

/**
 * Brand logo using the official Breathe Pickleball image.
 * variant="light" → shown on dark/brand backgrounds (logo has blue bg, so same look)
 * variant="dark"  → shown on white backgrounds (adds a subtle rounded card)
 */
export function Logo({
  variant = "dark",
  className = "",
}: {
  variant?: "light" | "dark";
  className?: string;
}) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} className="inline-block origin-left">
      <Link
        href="/"
        className={`inline-flex items-center gap-0 ${className}`}
        aria-label="Breathe Pickleball home"
      >
        <Image
          src="/breathe-logo-nav.png"
          alt="Breathe Pickleball"
          width={220}
          height={100}
          className={`h-11 w-auto object-contain ${
            variant === "dark"
              ? "rounded-xl shadow-sm"
              : "brightness-[1.05]"
          }`}
          priority
        />
      </Link>
    </motion.div>
  );
}

/** Keep PaddleMark exported for any legacy references */
export function PaddleMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden="true">
      <g transform="rotate(18 24 24)">
        <rect x="14" y="3" width="20" height="26" rx="10" fill="currentColor" />
        <rect x="21" y="27" width="6" height="15" rx="3" fill="currentColor" />
        <g fill="#2F5BFF">
          <circle cx="20" cy="11" r="1.6" />
          <circle cx="24" cy="11" r="1.6" />
          <circle cx="28" cy="11" r="1.6" />
          <circle cx="20" cy="16" r="1.6" />
          <circle cx="24" cy="16" r="1.6" />
          <circle cx="28" cy="16" r="1.6" />
          <circle cx="22" cy="21" r="1.6" />
          <circle cx="26" cy="21" r="1.6" />
        </g>
      </g>
      <circle cx="9" cy="14" r="6" fill="#C6F23E" />
      <g fill="#1B39C4">
        <circle cx="7" cy="12" r="1" />
        <circle cx="11" cy="12" r="1" />
        <circle cx="9" cy="16" r="1" />
        <circle cx="6.5" cy="15" r="0.9" />
      </g>
    </svg>
  );
}
