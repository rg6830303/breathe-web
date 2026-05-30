"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Loader2, ShieldCheck } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";

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
      <main className="min-h-[calc(100vh-200px)] bg-ink/95 px-4 py-12 sm:py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#0E1426] p-7 shadow-glow"
        >
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-lime">
            <ShieldCheck className="h-4 w-4" /> Owner console
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold text-white sm:text-3xl">Admin login</h1>
          <p className="mt-2 text-sm text-white/70">Restricted access. Use your owner credentials to manage Breathe.</p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-3">
            <Field label="Owner email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" required />
            <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="current-password" required />
            {error && (
              <div role="alert" className="rounded-xl border border-red-400/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-lime px-5 py-3.5 text-sm font-bold text-gray-900 transition hover:bg-lime-dark disabled:opacity-60"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enter console"}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-white/60">
            Not the owner?{" "}
            <Link href="/login" className="font-semibold text-lime hover:underline">
              Player login
            </Link>
          </div>
        </motion.div>
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
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-white/60">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-lime focus:ring-2 focus:ring-lime/20"
      />
    </label>
  );
}
