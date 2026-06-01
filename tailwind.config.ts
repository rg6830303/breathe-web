import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./emails/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand palette derived from the Breathe Pickleball logo (royal blue + white)
        brand: {
          DEFAULT: "#2F5BFF",
          50: "#F2F6FF",
          100: "#E4ECFF",
          200: "#C6D6FF",
          300: "#9DB6FF",
          400: "#6B8DFF",
          500: "#2F5BFF",
          600: "#2348E0",
          700: "#1B39C4",
          800: "#162E9A",
          900: "#152B7E",
        },
        ink: "#0D1426",
        slatey: "#475569",
        ball: "#0EA5E9", // accent (was lime #C6F23E — retoned to electric blue for stronger contrast on light & dark)
        // Spec palette additions (group1)
        lime: {
          DEFAULT: "#C6F432",
          dark: "#A3BF1A",
        },
        amber: {
          DEFAULT: "#FFC93C",
        },
        slot: {
          open: "#166534",
          openBg: "#DCFCE7",
          openBorder: "#86EFAC",
          booked: "#6B7280",
          bookedBg: "#F3F4F6",
          selected: "#2F5BFF",
          selectedBg: "#EEF2FF",
        },
        // Legacy tokens kept so any older references keep compiling.
        midnight: "#0B1530",
        court: "#2F5BFF",
        volt: "#2348E0",
        surface: "#0B1B3A",
        panel: "#F1F5FF",
        line: "rgba(15,23,42,0.10)",
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 24px 60px -20px rgba(47, 91, 255, 0.45)",
        card: "0 18px 40px -24px rgba(13, 20, 38, 0.25)",
        soft: "0 8px 24px -12px rgba(13, 20, 38, 0.18)",
      },
      borderRadius: {
        "2xl": "1.25rem",
        "3xl": "1.75rem",
      },
      animation: {
        ticker: "ticker 32s linear infinite",
        float: "float 6s ease-in-out infinite",
        "fade-up": "fade-up 0.6s ease-out both",
      },
      keyframes: {
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        float: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(16px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
