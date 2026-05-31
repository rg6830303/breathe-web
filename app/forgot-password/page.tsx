"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, Mail } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

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
      <main className="min-h-[calc(100vh-200px)] bg-brand-50/40 px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md rounded-3xl border border-brand/10 bg-white p-7 shadow-card"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            <KeyRound className="h-4 w-4" /> Reset password
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">Forgot your password?</h1>
          <p className="mt-2 text-sm text-slatey">
            Enter your account email and we&apos;ll send you a link to choose a new password.
          </p>

          {sent ? (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-bold">
                <Mail className="h-4 w-4" /> Check your email
              </div>
              <p className="mt-2">
                If an account exists for <strong>{email}</strong>, we&apos;ve sent a reset link. It expires in 60 minutes.
              </p>
              <p className="mt-3 text-xs text-emerald-700">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button type="button" className="underline" onClick={() => setSent(false)}>
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 grid gap-3">
              <label className="block">
                <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slatey">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-brand/15 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </label>
              {error && (
                <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="group mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 disabled:opacity-60"
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

          <div className="mt-5 text-center text-xs text-slatey">
            Remembered it?{" "}
            <Link href="/login" className="font-bold text-brand hover:underline">
              Back to login
            </Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </>
  );
}
