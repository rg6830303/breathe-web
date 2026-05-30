"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Check } from "lucide-react";
import { Logo, PaddleMark } from "@/components/logo";

/** Split-screen auth layout with an animated 3D brand panel. */
export function AuthShell({
  title,
  subtitle,
  highlights,
  error,
  children,
  footer,
  accent = "brand",
}: {
  title: string;
  subtitle: string;
  highlights: string[];
  error?: string;
  children: React.ReactNode;
  footer: React.ReactNode;
  accent?: "brand" | "owner";
}) {
  return (
    <div className="relative min-h-screen-safe overflow-hidden bg-white lg:grid lg:grid-cols-2">
      {/* Brand / 3D panel */}
      <aside className="brand-gradient brand-mesh relative hidden overflow-hidden p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="court-lines absolute inset-0 opacity-25" />
        <div className="pointer-events-none absolute -right-16 top-24 h-72 w-72 rounded-full bg-ball/20 blur-3xl animate-float" />
        <div className="pointer-events-none absolute -left-10 bottom-10 h-64 w-64 rounded-full bg-white/10 blur-3xl" />

        <div className="relative z-10">
          <Logo variant="light" />
        </div>

        <div className="relative z-10 flex items-center justify-center py-8">
          <div className="scene">
            <div className="paddle-3d flex h-56 w-56 items-center justify-center rounded-[2rem] border border-white/20 bg-white/10 shadow-glow backdrop-blur-md">
              <PaddleMark className="h-28 w-28 text-white drop-shadow-[0_12px_24px_rgba(0,0,0,0.25)]" />
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <h2 className="font-display text-3xl font-extrabold leading-tight">
            {accent === "owner" ? "Run the club from anywhere" : "Your game, one tap away"}
          </h2>
          <ul className="mt-6 space-y-3">
            {highlights.map((h) => (
              <li key={h} className="flex items-center gap-3 text-sm text-white/90">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                  <Check className="h-3.5 w-3.5 text-ball" />
                </span>
                {h}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Form panel */}
      <main className="relative flex min-h-screen-safe flex-col justify-center px-5 py-12 sm:px-10">
        <div className="pointer-events-none absolute inset-0 section-light lg:hidden" />
        <div className="relative mx-auto w-full max-w-md animate-fade-up">
          <div className="mb-8 flex items-center justify-between lg:hidden">
            <Logo />
          </div>
          <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-slatey transition hover:text-brand">
            <ArrowLeft className="h-4 w-4" /> Back to site
          </Link>

          <h1 className="font-display text-3xl font-extrabold text-ink">{title}</h1>
          <p className="mt-2 text-sm text-slatey">{subtitle}</p>

          {error && (
            <div className="mt-6 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-6">{children}</div>

          <div className="mt-6 text-sm text-slatey">{footer}</div>
        </div>
      </main>
    </div>
  );
}

/** Styled text input for auth forms. */
export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  /** Lets the caller force the correct mobile keyboard. If omitted, we infer a
   *  sensible default from `type` (email → email, tel → tel, number → numeric). */
  inputMode?: "text" | "email" | "tel" | "numeric" | "decimal" | "search" | "url" | "none";
  required?: boolean;
}) {
  // Auto-derive inputMode when not explicit. Keeps callers terse for the
  // common cases but lets specific fields (OTP, postcode) override.
  const derivedInputMode =
    inputMode ??
    (type === "email" ? "email" : type === "tel" ? "tel" : type === "number" ? "numeric" : undefined);
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-ink">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={derivedInputMode}
        required={required}
        className="w-full rounded-2xl border border-brand/15 bg-white px-4 py-3 text-sm text-ink shadow-soft outline-none transition focus:border-brand focus:ring-4 focus:ring-brand/10"
      />
    </label>
  );
}
