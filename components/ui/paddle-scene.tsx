"use client";

import { useRef } from "react";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useReducedMotion,
} from "framer-motion";

/**
 * Signature 3D pickleball paddle + ball — the visual motif of the redesign.
 *
 * Built with layered CSS 3D transforms (no three.js): a paddle with real
 * Z-depth (face + rim + back plate), a perforated hole grid, a glossy sweep,
 * a grip-wrapped handle, and a holed ball that orbits in an elliptical arc.
 * The whole rig tilts toward the pointer with spring physics and idles with a
 * slow float/rotate. Fully reduced-motion aware.
 */
export function PaddleScene({
  className = "",
  size = 320,
  /** Paddle face gradient — defaults to brand blue. Pass lime/ink variants per surface. */
  faceFrom = "#3b66ff",
  faceTo = "#1b3bd6",
}: {
  className?: string;
  size?: number;
  faceFrom?: string;
  faceTo?: string;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  // Pointer-driven tilt (spring-smoothed).
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const rotX = useSpring(useTransform(py, [-0.5, 0.5], [18, -18]), { stiffness: 120, damping: 16 });
  const rotY = useSpring(useTransform(px, [-0.5, 0.5], [-26, 26]), { stiffness: 120, damping: 16 });

  function onMove(e: React.PointerEvent) {
    if (reduce) return;
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    px.set((e.clientX - r.left) / r.width - 0.5);
    py.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() {
    px.set(0);
    py.set(0);
  }

  // Perforated hole grid for the paddle face.
  const holes = Array.from({ length: 5 * 6 });

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`relative select-none ${className}`}
      style={{ width: size, height: size, perspective: 1000 }}
      aria-hidden
    >
      {/* Idle float + pointer tilt rig */}
      <motion.div
        className="absolute inset-0"
        style={{ transformStyle: "preserve-3d", rotateX: rotX, rotateY: rotY }}
        animate={reduce ? undefined : { y: [0, -14, 0], rotateZ: [-3, 3, -3] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Soft contact shadow on the ground plane */}
        <div
          className="absolute left-1/2 top-[78%] h-10 rounded-[50%] bg-black/30 blur-xl"
          style={{ width: size * 0.5, transform: "translateX(-50%) translateZ(-60px)" }}
        />

        {/* PADDLE */}
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transform: "translate(-50%,-54%)", transformStyle: "preserve-3d" }}
        >
          {/* Back plate — gives the paddle thickness */}
          <div
            className="absolute left-1/2 top-1/2 rounded-[46%_46%_44%_44%/52%_52%_48%_48%]"
            style={{
              width: size * 0.52,
              height: size * 0.64,
              transform: "translate(-50%,-50%) translateZ(-18px)",
              background: "#0b1020",
            }}
          />
          {/* Rim ring */}
          <div
            className="absolute left-1/2 top-1/2 rounded-[46%_46%_44%_44%/52%_52%_48%_48%]"
            style={{
              width: size * 0.55,
              height: size * 0.67,
              transform: "translate(-50%,-50%) translateZ(-9px)",
              background: "linear-gradient(160deg,#c6f432,#9bbd18)",
              boxShadow: "0 30px 60px -20px rgba(0,0,0,0.55)",
            }}
          />
          {/* Face */}
          <div
            className="absolute left-1/2 top-1/2 overflow-hidden rounded-[46%_46%_44%_44%/52%_52%_48%_48%]"
            style={{
              width: size * 0.52,
              height: size * 0.64,
              transform: "translate(-50%,-50%) translateZ(0px)",
              background: `radial-gradient(120% 80% at 30% 18%, ${faceFrom}, ${faceTo} 70%)`,
            }}
          >
            {/* Hole grid */}
            <div
              className="absolute inset-0 grid place-items-center"
              style={{ padding: "18%" }}
            >
              <div className="grid grid-cols-5 gap-[10%]">
                {holes.map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      width: size * 0.022,
                      height: size * 0.022,
                      background: "rgba(0,0,0,0.32)",
                      boxShadow: "inset 0 1px 1px rgba(0,0,0,0.5), 0 1px 0 rgba(255,255,255,0.12)",
                    }}
                  />
                ))}
              </div>
            </div>
            {/* Glossy sweep */}
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "linear-gradient(125deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.05) 30%, rgba(255,255,255,0) 55%)",
              }}
            />
          </div>

          {/* Handle */}
          <div
            className="absolute left-1/2"
            style={{
              top: size * 0.3,
              width: size * 0.12,
              height: size * 0.34,
              transform: "translateX(-50%) translateZ(-4px)",
              background: "linear-gradient(180deg,#1f2937,#0b1020)",
              borderRadius: `0 0 ${size * 0.06}px ${size * 0.06}px`,
              boxShadow: "inset 2px 0 4px rgba(255,255,255,0.08), inset -2px 0 4px rgba(0,0,0,0.5)",
            }}
          >
            {/* Grip wrap lines */}
            {[0.18, 0.36, 0.54, 0.72].map((t) => (
              <span
                key={t}
                className="absolute left-0 right-0"
                style={{ top: `${t * 100}%`, height: 2, background: "rgba(198,244,50,0.5)", transform: "skewY(-12deg)" }}
              />
            ))}
          </div>
        </div>

        {/* BALL — orbiting holed pickleball */}
        <motion.div
          className="absolute left-1/2 top-1/2"
          style={{ transformStyle: "preserve-3d" }}
          animate={
            reduce
              ? undefined
              : {
                  x: [size * 0.22, size * 0.34, size * 0.22, size * 0.1, size * 0.22],
                  y: [-size * 0.18, size * 0.05, size * 0.26, size * 0.05, -size * 0.18],
                  z: [40, 90, 40, -10, 40],
                }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div
            className="relative rounded-full"
            style={{
              width: size * 0.16,
              height: size * 0.16,
              background: "radial-gradient(circle at 32% 28%, #f7ff8a, #c6f432 55%, #8fae12)",
              boxShadow: "0 12px 24px -8px rgba(0,0,0,0.5), inset -4px -6px 10px rgba(0,0,0,0.25)",
            }}
          >
            {/* Ball holes */}
            {[
              [30, 30], [62, 26], [44, 50], [26, 62], [66, 60],
            ].map(([l, t], i) => (
              <span
                key={i}
                className="absolute rounded-full bg-black/35"
                style={{ left: `${l}%`, top: `${t}%`, width: size * 0.02, height: size * 0.02 }}
              />
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
