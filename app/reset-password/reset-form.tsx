"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";

export function ResetPasswordForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Missing reset token. Use the link from your email.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed.");
      setDone(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative z-10 w-full max-w-md"
    >
      <div className="card-sport overflow-hidden bg-white dark:bg-[#111c38]">
        {/* Card top accent stripe */}
        <div aria-hidden className="tape-stripe h-1 w-full" />

        <div className="p-7 sm:p-9">
          {/* Icon + eyebrow */}
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white">
              <KeyRound className="h-5 w-5" />
            </div>
            <span className="eyebrow text-brand dark:text-brand-300">Choose a new password</span>
          </div>

          <h1 className="heading-lg text-ink dark:text-white">
            Set a new{" "}
            <span className="mark-lime">password</span>
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-slatey dark:text-white/60">
            Pick something at least 8 characters. You&apos;ll be signed in after saving.
          </p>

          {done ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-7 rounded-2xl border-2 border-lime/40 bg-lime/10 p-5"
            >
              <div className="flex items-center gap-2 font-display text-sm font-extrabold text-lime-dark">
                <ShieldCheck className="h-4 w-4" /> Password updated
              </div>
              <p className="mt-2 text-sm text-ink/80 dark:text-white/70">
                Redirecting you to the login page…
              </p>
            </motion.div>
          ) : (
            <form onSubmit={onSubmit} className="mt-7 grid gap-4">
              <label className="block">
                <span className="mb-1.5 block text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/50">
                  New password
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-semibold text-ink outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-brand-300"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-slatey dark:text-white/50">
                  Confirm new password
                </span>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
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
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving…
                  </>
                ) : (
                  <>
                    Save new password <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-ink/10 pt-5 text-center text-xs text-slatey dark:border-white/10 dark:text-white/40">
            <Link href="/login" className="font-extrabold text-brand hover:underline dark:text-brand-300">
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
