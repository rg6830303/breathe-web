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
    hidden: { scale: 0.9, opacity: 0, borderColor: "rgba(228,236,255,1)" },
    visible: {
      scale: 1,
      opacity: 1,
      borderColor: "#FFC93C",
      transition: { type: "spring" as const, stiffness: 200, damping: 15, delay: 1.8 },
    },
  };

  return (
    <div ref={containerRef} className="w-full flex justify-center p-4 bg-gray-50 rounded-2xl border border-brand/5">
      <div className="w-full max-w-[600px] aspect-[600/320] relative">
        <svg
          viewBox="0 0 600 320"
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Connecting lines */}
          {/* Semi 1 to Final */}
          <motion.path
            d="M 160,84 C 300,84 300,154 440,154"
            fill="none"
            stroke="#2F5BFF"
            strokeWidth="2"
            strokeDasharray="600"
            variants={lineVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          />
          {/* Semi 2 to Final */}
          <motion.path
            d="M 160,224 C 300,224 300,154 440,154"
            fill="none"
            stroke="#2F5BFF"
            strokeWidth="2"
            strokeDasharray="600"
            variants={lineVariants}
            initial="hidden"
            animate={inView ? "visible" : "hidden"}
          />

          {/* Team Boxes */}
          {/* Semi 1: Team 1 */}
          <g transform="translate(20, 60)">
            <motion.rect
              width="140"
              height="48"
              rx="8"
              fill="white"
              stroke="#E4ECFF"
              strokeWidth="1.5"
              variants={boxVariants(0.1)}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="shadow-sm"
            />
            <motion.text
              x="12"
              y="28"
              fill="#0D1426"
              fontSize="12"
              fontWeight="bold"
              fontFamily="sans-serif"
              variants={boxVariants(0.15)}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              Player A / B
            </motion.text>
          </g>

          {/* Semi 2: Team 2 */}
          <g transform="translate(20, 200)">
            <motion.rect
              width="140"
              height="48"
              rx="8"
              fill="white"
              stroke="#E4ECFF"
              strokeWidth="1.5"
              variants={boxVariants(0.3)}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="shadow-sm"
            />
            <motion.text
              x="12"
              y="28"
              fill="#0D1426"
              fontSize="12"
              fontWeight="bold"
              fontFamily="sans-serif"
              variants={boxVariants(0.35)}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              Player C / D
            </motion.text>
          </g>

          {/* Winner Box */}
          <g transform="translate(440, 130)">
            <motion.rect
              width="140"
              height="48"
              rx="8"
              fill="white"
              stroke="#FFC93C"
              strokeWidth="2"
              variants={winnerVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              className="shadow-md"
            />
            <motion.text
              x="36"
              y="28"
              fill="#0D1426"
              fontSize="12"
              fontWeight="extrabold"
              fontFamily="sans-serif"
              variants={winnerVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
            >
              CHAMPION
            </motion.text>
            
            {/* Gold Trophy Icon */}
            <motion.g
              variants={winnerVariants}
              initial="hidden"
              animate={inView ? "visible" : "hidden"}
              transform="translate(12, 16)"
            >
              <path
                d="M1.5 1.5h9M3 1.5V6a3 3 0 003 3 3 3 0 003-3V1.5M6 9v3M3.75 12h4.5"
                fill="none"
                stroke="#FFC93C"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.g>
          </g>
        </svg>
      </div>
    </div>
  );
}
