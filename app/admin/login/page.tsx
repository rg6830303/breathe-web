import type { Metadata } from "next";
import Link from "next/link";
import { Info, ShieldCheck } from "lucide-react";
import { AuthField, AuthShell } from "@/components/auth-shell";
import { adminLogin } from "@/app/actions/auth";

export const metadata: Metadata = {
  title: "Owner Login",
  description: "Secure owner console login for Breathe Pickleball.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const demoMode = !process.env.ADMIN_PASSWORD && !process.env.ADMIN_EMAIL;

  return (
    <AuthShell
      accent="owner"
      title="Owner console"
      subtitle="Restricted access. Log in to manage bookings, pricing, and finances."
      error={sp.error}
      highlights={[
        "Live booking ledger & status control",
        "Dynamic pricing rules per time slot",
        "Finance tracking and CSV exports",
      ]}
      footer={
        <span className="flex items-center gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-brand" />
          This area is for the club owner only.
        </span>
      }
    >
      <form action={adminLogin} className="space-y-4">
        <AuthField label="Owner email" name="email" type="email" placeholder="owner@breathepickleball.in" autoComplete="email" />
        <AuthField label="Password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" />
        <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-5 py-3.5 text-sm font-bold text-white shadow-glow transition hover:bg-ink/90 active:scale-[0.99]">
          <ShieldCheck className="h-4 w-4" /> Enter console
        </button>
      </form>

      {demoMode && (
        <div className="mt-5 flex items-start gap-2 rounded-2xl border border-brand/15 bg-brand/5 p-3 text-xs text-ink">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <span>
            Demo mode: no owner credentials are configured yet. Use password{" "}
            <code className="rounded bg-white px-1.5 py-0.5 font-bold text-brand">breathe-admin</code> to preview the
            console. Set <code className="font-semibold">ADMIN_EMAIL</code> and{" "}
            <code className="font-semibold">ADMIN_PASSWORD</code> in your environment for production.
          </span>
        </div>
      )}

      <div className="mt-5 text-center text-xs text-slatey">
        Not the owner?{" "}
        <Link href="/login" className="font-semibold text-brand hover:underline">
          Player login
        </Link>
      </div>
    </AuthShell>
  );
}
