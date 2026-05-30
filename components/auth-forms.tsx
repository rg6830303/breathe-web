"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, LogIn, ShieldCheck } from "lucide-react";

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slatey">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        placeholder={props.placeholder}
        className="w-full rounded-xl border border-brand/15 bg-white px-4 py-3 text-sm text-ink outline-none focus:border-brand focus:ring-2 focus:ring-brand/20"
      />
    </label>
  );
}

export function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-md rounded-3xl border border-brand/10 bg-white p-7 shadow-card"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
        <ShieldCheck className="h-4 w-4" /> Create account
      </div>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">Join Breathe Pickleball</h1>
      <p className="mt-2 text-sm text-slatey">Book courts, track your sessions, and join tournaments.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <Field label="Full name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} autoComplete="name" required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="new-password" placeholder="At least 8 characters" required />
        <Field label="Phone (optional)" type="tel" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} autoComplete="tel" />
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-slatey">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Log in
        </Link>
      </div>
    </motion.div>
  );
}

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto w-full max-w-md rounded-3xl border border-brand/10 bg-white p-7 shadow-card"
    >
      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-brand">
        <LogIn className="h-4 w-4" /> Welcome back
      </div>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink sm:text-3xl">Log in to Breathe</h1>
      <p className="mt-2 text-sm text-slatey">Pick up where you left off — book a court or check your sessions.</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="current-password" required />
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
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-1 text-center text-xs text-slatey">
        <span>
          New to Breathe?{" "}
          <Link href="/signup" className="font-bold text-brand hover:underline">
            Create an account
          </Link>
        </span>
        <span>
          Club owner?{" "}
          <Link href="/admin/login" className="font-semibold text-brand hover:underline">
            Admin login
          </Link>
        </span>
      </div>
    </motion.div>
  );
}
