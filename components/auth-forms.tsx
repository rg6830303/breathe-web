"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Loader2, LogIn, ShieldCheck } from "lucide-react";

/** Friendly messages for ?error=google_* redirects from the OAuth routes. */
const OAUTH_ERRORS: Record<string, string> = {
  google_unconfigured: "Google sign-in isn't configured yet. Please use email and password.",
  google_denied: "Google sign-in was cancelled.",
  google_state: "Your sign-in session expired. Please try again.",
  google_invalid: "Google sign-in failed. Please try again.",
  google_noemail: "Your Google account didn't share an email address.",
  google_unverified: "Please verify your email with Google, then try again.",
  google_dberror: "We couldn't finish creating your account. Please try again.",
  google_failed: "Google sign-in failed. Please try again.",
};

/** "Continue with Google" — a plain link to the server-side OAuth start route,
 *  preserving the post-login `next` destination. */
function GoogleButton({ next, label }: { next: string; label: string }) {
  return (
    <a
      href={`/api/auth/google?next=${encodeURIComponent(next)}`}
      className="inline-flex w-full items-center justify-center gap-3 rounded-2xl border border-brand/15 bg-white px-5 py-3.5 text-sm font-bold text-ink transition hover:bg-brand/5 dark:border-white/15 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
        <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.46 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
      </svg>
      {label}
    </a>
  );
}

/** Visual "or" divider between OAuth and the email form. */
function OrDivider() {
  return (
    <div className="my-4 flex items-center gap-3 text-[0.7rem] font-semibold uppercase tracking-widest text-slatey">
      <span className="h-px flex-1 bg-brand/10 dark:bg-white/10" />
      or
      <span className="h-px flex-1 bg-brand/10 dark:bg-white/10" />
    </div>
  );
}

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
      <span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slatey dark:text-white/55">{props.label}</span>
      <input
        type={props.type ?? "text"}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
        autoComplete={props.autoComplete}
        required={props.required}
        placeholder={props.placeholder}
        className="w-full rounded-xl border-2 border-ink/10 bg-white px-4 py-3 text-sm font-medium text-ink outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/15 dark:border-white/15 dark:bg-white/5 dark:text-white dark:placeholder:text-white/40"
      />
    </label>
  );
}

export function SignupForm() {
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
      // Hard redirect so the new session cookie is read server-side on the next request
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card-sport mx-auto w-full max-w-md p-7 shadow-card sm:p-8"
    >
      <span className="eyebrow"><ShieldCheck className="h-3.5 w-3.5" /> Create account</span>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-[2.1rem]">Join Breathe Pickleball</h1>
      <p className="mt-2 text-sm text-slatey dark:text-white/60">Book courts, track your sessions, and join tournaments.</p>

      <div className="mt-6">
        <GoogleButton next={next} label="Sign up with Google" />
      </div>
      <OrDivider />

      <form onSubmit={onSubmit} className="grid gap-3">
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
          className="btn-primary group mt-1 w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-xs text-slatey dark:text-white/55">
        Already have an account?{" "}
        <Link href="/login" className="font-bold text-brand hover:underline">
          Log in
        </Link>
      </div>
    </motion.div>
  );
}

export function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";
  const oauthError = params.get("error");
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    oauthError ? (OAUTH_ERRORS[oauthError] ?? null) : null,
  );

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
      // Hard redirect ensures the session cookie is sent to the server-side
      // dashboard page, bypassing the Next.js App Router client cache entirely.
      window.location.href = next;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="card-sport mx-auto w-full max-w-md p-7 shadow-card sm:p-8"
    >
      <span className="eyebrow"><LogIn className="h-3.5 w-3.5" /> Welcome back</span>
      <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink dark:text-white sm:text-[2.1rem]">Log in to Breathe</h1>
      <p className="mt-2 text-sm text-slatey dark:text-white/60">Pick up where you left off — book a court or check your sessions.</p>

      <div className="mt-6">
        <GoogleButton next={next} label="Continue with Google" />
      </div>
      <OrDivider />

      <form onSubmit={onSubmit} className="grid gap-3">
        <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} autoComplete="email" required />
        <Field label="Password" type="password" value={form.password} onChange={(v) => setForm({ ...form, password: v })} autoComplete="current-password" required />
        <div className="-mt-1 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary group mt-1 w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-1 text-center text-xs text-slatey dark:text-white/55">
        <span>
          New to Breathe?{" "}
          <Link href="/signup" className="font-bold text-brand hover:underline">
            Create an account
          </Link>
        </span>
      </div>
    </motion.div>
  );
}
