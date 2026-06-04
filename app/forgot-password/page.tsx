"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PaddleScene } from "@/components/ui/paddle-scene";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen-safe bg-ink">
        {/* Tape stripe top accent */}
        <div aria-hidden className="tape-stripe h-1.5 w-full" />

        <div className="relative flex min-h-[calc(100vh-4rem)] items-center justify-center overflow-hidden px-4 py-16">
          {/* Court-line background */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,0.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.9) 1px, transparent 1px)",
              backgroundSize: "44px 44px",
            }}
          />

          {/* Decorative paddle — right side, large screens */}
          <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-70 xl:block">
            <PaddleScene size={260} faceFrom="#c6f432" faceTo="#9bbd18" />
          </div>

          {/* Lime block accent */}
          <div aria-hidden className="pointer-events-none absolute -left-12 bottom-12 h-40 w-40 rotate-12 rounded-[2rem] bg-lime/10" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 w-full max-w-md"
          >
            {/* Card */}
            <div className="card-sport overflow-hidden bg-white dark:bg-[#111c38]">
              {/* Card top accent stripe */}
              <div aria-hidden className="tape-stripe h-1 w-full" />

              <div className="p-7 sm:p-9">
                {/* Icon + eyebrow */}
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
                    <KeyRound className="h-5 w-5" />
                  </div>
                  <span className="eyebrow text-brand dark:text-brand-300">Reset password</span>
                </div>

                <h1 className="heading-lg text-ink dark:text-white">
                  Forgot your{" "}
                  <span className="mark-lime">password?</span>
                </h1>
                <p className="mt-3 text-sm leading-relaxed text-slatey dark:text-white/60">
                  Enter your account email and we&apos;ll send you a link to choose a new password.
                </p>

                {sent ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-7 rounded-2xl border-2 border-lime/40 bg-lime/10 p-5"
                  >
                    <div className="flex items-center gap-2 font-display text-sm font-extrabold text-lime-dark">
                      <Mail className="h-4 w-4" /> Check your email
                    </div>
                    <p className="mt-2 text-sm text-ink/80 dark:text-white/70">
                      If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. It expires in 60 minutes.
                    </p>
                    <p className="mt-3 text-xs text-slatey dark:text-white/50">
                      Didn&apos;t get it? Check your spam folder, or{" "}
                      <button type="button" className="font-bold text-brand underline hover:text-brand-600" onClick={() => setSent(false)}>
                        try again
                      </button>
                      .
                    </p>
                  </motion.div>
                ) : (
                  <form onSubmit={onSubmit} className="mt-7 grid gap-4">
                    <label className="block">
                      <span className="mb-1.5 block text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/50">
                        Email address
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                        required
                        className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-300"
                      />
                    </label>

                    {error && (
                      <div role="alert" className="rounded-xl border-2 border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-400">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-primary group mt-1 w-full justify-center"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Sending link…
                        </>
                      ) : (
                        <>
                          Send reset link <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </>
                      )}
                    </button>
                  </form>
                )}

                <div className="mt-6 border-t border-ink/10 pt-5 text-center text-xs text-slatey dark:border-white/10 dark:text-white/40">
                  Remembered it?{" "}
                  <Link href="/login" className="font-extrabold text-brand hover:underline dark:text-brand-300">
                    Back to login
                  </Link>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  );
}
