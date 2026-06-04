"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PaddleScene } from "@/components/ui/paddle-scene";

export default function AdminLoginPage() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Invalid credentials");
      // Hard redirect — ensures admin session cookie is sent to the server-side
      // admin page, bypassing Next.js App Router client cache entirely.
      window.location.href = "/admin";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <main className="relative min-h-screen-safe overflow-hidden bg-ink">
        {/* Court lines background */}
        <div
          aria-hidden
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.18) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />
        {/* Tape stripe top accent */}
        <div aria-hidden className="tape-stripe absolute left-0 top-0 h-1.5 w-full opacity-90" />

        {/* 3D paddle accent — right side, large screens only */}
        <div className="pointer-events-none absolute right-8 top-1/2 hidden -translate-y-1/2 opacity-80 xl:block">
          <PaddleScene size={280} faceFrom="#c6f432" faceTo="#9bbd18" />
        </div>

        <div className="relative flex min-h-screen-safe items-center justify-center px-4 py-16">
          <div className="w-full max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header above card */}
              <div className="mb-6 text-center">
                <span className="eyebrow text-lime">
                  <ShieldCheck className="h-4 w-4" /> Restricted access
                </span>
                <h1 className="heading-lg mt-2 text-white">Owner <span className="mark-lime">Console</span></h1>
                <p className="mt-2 text-sm text-white/60">
                  Use your owner credentials to manage Breathe Pickleball.
                </p>
              </div>

              {/* Login card */}
              <div className="overflow-hidden rounded-3xl border-2 border-white/10 bg-[#0E1426] shadow-2xl">
                {/* Card top stripe */}
                <div className="h-1 bg-brand" />

                <div className="p-7">
                  <form onSubmit={onSubmit} className="grid gap-4">
                    <Field
                      label="Owner email"
                      type="email"
                      value={form.email}
                      onChange={(v) => setForm({ ...form, email: v })}
                      autoComplete="email"
                      required
                    />
                    <Field
                      label="Password"
                      type="password"
                      value={form.password}
                      onChange={(v) => setForm({ ...form, password: v })}
                      autoComplete="current-password"
                      required
                    />
                    {error && (
                      <div
                        role="alert"
                        className="rounded-xl border-2 border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                      >
                        {error}
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={loading}
                      className="btn-accent mt-1 w-full justify-center py-3.5 text-sm disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      {loading ? "Verifying…" : "Enter console"}
                    </button>
                  </form>

                  <div className="mt-5 border-t-2 border-white/10 pt-4 text-center text-xs text-white/40">
                    Not the owner?{" "}
                    <Link href="/login" className="font-bold text-lime hover:underline">
                      Player login
                    </Link>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/50">
        {props.label}
      </span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none transition focus:border-lime focus:ring-2 focus:ring-lime/20"
      />
    </label>
  );
}
