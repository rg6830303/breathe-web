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
      <main className="bg-brand-50/30">
        <PortalHero
          eyebrow="Owner console"
          title={<h1 className="font-serif-hero text-3xl italic sm:text-4xl">Breathe Pickleball admin</h1>}
          subtitle="Bookings, court availability, users, and revenue — live from Turso."
          right={
            <div className="flex flex-col items-start gap-2 md:items-end">
              <span className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold text-white ring-1 ring-white/15">
                Signed in as {admin.email}
              </span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/notices"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
                >
                  <Megaphone className="h-3.5 w-3.5" /> Notices
                </Link>
                <Link
                  href="/admin/settings"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
                >
                  <SettingsIcon className="h-3.5 w-3.5" /> Settings
                </Link>
                <Link
                  href="/admin/diagnostics"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-white/25"
                >
                  <Activity className="h-3.5 w-3.5" /> Diagnostics
                </Link>
              </div>
            </div>
          }
        />

        <Container className="py-8 space-y-6">
          <TodayPanel />
          <AdminConsole />
        </Container>
      </main>
      <Footer />
    </>
  );
}
