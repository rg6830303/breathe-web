"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Trophy } from "lucide-react";

export function TournamentBracket() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inView = useInView(containerRef, { once: true, margin: "-40px" });

  const lineVariants = {
    hidden: { pathLength: 0 },
    visible: {
      pathLength: 1,
      transition: { duration: 1.2, ease: "easeInOut" as const, delay: 0.6 },
    },
  };

  const boxVariants = (delay: number) => ({
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" as const, delay },
    },
  });

  const winnerVariants = {
    hidden: { scale: 0.9, opacity: 0, borderColor: "rgba(13,20,38,0.15)" },
    visible: {
      scale: 1,
      opacity: 1,
      borderColor: "#c6f432",
      transition: { type: "spring" as const, stiffness: 200, damping: 15, delay: 1.8 },
    },
  };

  return (
    <div
      ref={containerRef}
      className="w-full overflow-hidden rounded-3xl border-2 border-ink/10 bg-white p-4 dark:border-white/10 dark:bg-[#111c38]"
    >
      {/* Section label */}
      <div className="mb-4 flex items-center gap-3 px-2">
        <Trophy className="h-4 w-4 text-brand" aria-hidden />
        <span className="text-[0.7rem] font-extrabold uppercase tracking-[0.22em] text-brand dark:text-brand-300">
          Tournament Bracket
        </span>
      </div>

      {/* Tape stripe accent */}
      <div className="tape-stripe mb-4 h-1 w-full rounded-full" aria-hidden />

      <div className="flex w-full justify-center">
        <div className="w-full max-w-[600px] aspect-[600/320] relative">
          <svg
            viewBox="0 0 600 320"
            className="w-full h-full"
            preserveAspectRatio="xMidYMid meet"
            aria-label="Tournament bracket showing two semi-final teams and a champion slot"
            role="img"
          >
            {/* Connector: Semi 1 → Final */}
            <motion.path
              d="M 160,84 C 300,84 300,154 440,154"
              fill="none"
              stroke="#2F5BFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="600"
              variants={lineVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            />
            {/* Connector: Semi 2 → Final */}
            <motion.path
              d="M 160,224 C 300,224 300,154 440,154"
              fill="none"
              stroke="#2F5BFF"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray="600"
              variants={lineVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            />

            {/* ---- Semi 1 box ---- */}
            <g transform="translate(20, 60)">
              {/* Border rect (ink) */}
              <motion.rect
                width="140"
                height="48"
                rx="10"
                fill="white"
                stroke="#0d1426"
                strokeWidth="2"
                variants={boxVariants(0.1)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              />
              {/* Brand accent bar */}
              <motion.rect
                x="0"
                y="0"
                width="4"
                height="48"
                rx="2"
                fill="#2F5BFF"
                variants={boxVariants(0.12)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              />
              <motion.text
                x="14"
                y="20"
                fill="#0d1426"
                fontSize="10"
                fontWeight="800"
                fontFamily="sans-serif"
                letterSpacing="0.06em"
                textAnchor="start"
                variants={boxVariants(0.15)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              >
                SEMI-FINAL 1
              </motion.text>
              <motion.text
                x="14"
                y="36"
                fill="#0d1426"
                fontSize="12"
                fontWeight="700"
                fontFamily="sans-serif"
                variants={boxVariants(0.18)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              >
                Player A / B
              </motion.text>
            </g>

            {/* ---- Semi 2 box ---- */}
            <g transform="translate(20, 200)">
              <motion.rect
                width="140"
                height="48"
                rx="10"
                fill="white"
                stroke="#0d1426"
                strokeWidth="2"
                variants={boxVariants(0.3)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              />
              <motion.rect
                x="0"
                y="0"
                width="4"
                height="48"
                rx="2"
                fill="#2F5BFF"
                variants={boxVariants(0.32)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              />
              <motion.text
                x="14"
                y="20"
                fill="#0d1426"
                fontSize="10"
                fontWeight="800"
                fontFamily="sans-serif"
                letterSpacing="0.06em"
                variants={boxVariants(0.35)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              >
                SEMI-FINAL 2
              </motion.text>
              <motion.text
                x="14"
                y="36"
                fill="#0d1426"
                fontSize="12"
                fontWeight="700"
                fontFamily="sans-serif"
                variants={boxVariants(0.38)}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              >
                Player C / D
              </motion.text>
            </g>

            {/* ---- Champion box ---- */}
            <g transform="translate(440, 130)">
              {/* Lime fill background */}
              <motion.rect
                width="140"
                height="48"
                rx="10"
                fill="#0d1426"
                stroke="#c6f432"
                strokeWidth="2.5"
                variants={winnerVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              />
              {/* Lime accent bar on left */}
              <motion.rect
                x="0"
                y="0"
                width="5"
                height="48"
                rx="2"
                fill="#c6f432"
                variants={winnerVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              />
              {/* Trophy icon path */}
              <motion.g
                variants={winnerVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
                transform="translate(14, 16)"
              >
                <path
                  d="M1.5 1.5h9M3 1.5V6a3 3 0 003 3 3 3 0 003-3V1.5M6 9v3M3.75 12h4.5"
                  fill="none"
                  stroke="#c6f432"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </motion.g>
              <motion.text
                x="30"
                y="20"
                fill="#c6f432"
                fontSize="10"
                fontWeight="800"
                fontFamily="sans-serif"
                letterSpacing="0.12em"
                variants={winnerVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              >
                FINAL
              </motion.text>
              <motion.text
                x="14"
                y="36"
                fill="white"
                fontSize="12"
                fontWeight="800"
                fontFamily="sans-serif"
                letterSpacing="0.04em"
                variants={winnerVariants}
                initial="hidden"
                animate={inView ? "visible" : "hidden"}
              >
                CHAMPION
              </motion.text>
            </g>
          </svg>
        </div>
      </div>
    </div>
  );
}
