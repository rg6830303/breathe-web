import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, Megaphone, Settings as SettingsIcon } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container } from "@/components/ui";
import { PortalHero } from "@/components/ui/portal-hero";
import { AdminConsole } from "@/components/admin-console";
import { getAdminSession } from "@/lib/auth";
import { TodayPanel } from "./today-panel";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <Nav />
      <main className="app-surface bg-brand-50/30 dark:bg-ink">
        <PortalHero
          eyebrow="Owner console"
          title={<h1 className="heading-lg text-white">Breathe Pickleball <span className="mark-lime">Admin</span></h1>}
          subtitle="Bookings, court availability, users, and revenue — live from Turso."
          right={
            <div className="flex flex-col items-start gap-3 md:items-end">
              <span className="tag-sport border-white/20 bg-white/10 text-white/90 dark:border-white/20 dark:bg-white/10 dark:text-white/90">
                Signed in as {admin.email}
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/notices"
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:border-lime hover:text-lime"
                >
                  <Megaphone className="h-3.5 w-3.5" /> Notices
                </Link>
                <Link
                  href="/admin/settings"
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:border-lime hover:text-lime"
                >
                  <SettingsIcon className="h-3.5 w-3.5" /> Settings
                </Link>
                <Link
                  href="/admin/diagnostics"
                  className="inline-flex items-center gap-1.5 rounded-full border-2 border-white/20 px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-wide text-white transition hover:border-lime hover:text-lime"
                >
                  <Activity className="h-3.5 w-3.5" /> Diagnostics
                </Link>
              </div>
            </div>
          }
        />

        <Container className="space-y-6 py-8">
          <TodayPanel />
          <AdminConsole />
        </Container>
      </main>
      <Footer />
    </>
  );
}
