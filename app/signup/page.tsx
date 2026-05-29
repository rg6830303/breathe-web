import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthField, AuthShell } from "@/components/auth-shell";
import { userSignup } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Sign up for a Breathe Pickleball account to book courts, join tournaments, and track your game.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Create your account"
      subtitle="Join the Breathe community and start booking in seconds."
      error={sp.error}
      highlights={[
        "Instant court booking, no calls",
        "Coaching & tournament sign-ups",
        "Personal stats and progress",
      ]}
      footer={
        <span>
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-brand hover:underline">
            Log in
          </Link>
        </span>
      }
    >
      <form action={userSignup} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
        <AuthField label="Full name" name="name" placeholder="Your name" autoComplete="name" />
        <AuthField label="Email" name="email" type="email" placeholder="you@email.com" autoComplete="email" />
        <AuthField label="Password" name="password" type="password" placeholder="At least 6 characters" autoComplete="new-password" />
        <button className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.99]">
          Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
        <p className="text-center text-xs text-slatey">
          By signing up you agree to our facility rules and fair-play policy.
        </p>
      </form>
    </AuthShell>
  );
}
