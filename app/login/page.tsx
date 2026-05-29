import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthField, AuthShell } from "@/components/auth-shell";
import { userLogin } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Player Login",
  description: "Log in to your Breathe Pickleball account to book courts and track your progress.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Log in to book courts, view your bookings, and track your stats."
      error={sp.error}
      highlights={[
        "Book any court in seconds",
        "See your match stats & streaks",
        "Get tournament & event alerts",
      ]}
      footer={
        <span>
          New to Breathe?{" "}
          <Link href="/signup" className="font-bold text-brand hover:underline">
            Create an account
          </Link>
        </span>
      }
    >
      <form action={userLogin} className="space-y-4">
        <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
        <AuthField label="Email" name="email" type="email" placeholder="you@email.com" autoComplete="email" />
        <AuthField label="Password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        <button className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600 active:scale-[0.99]">
          Log in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
      <div className="mt-5 text-center text-xs text-slatey">
        Are you the club owner?{" "}
        <Link href="/admin/login" className="font-semibold text-brand hover:underline">
          Owner login
        </Link>
      </div>
    </AuthShell>
  );
}
