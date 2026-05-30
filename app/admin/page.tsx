import { redirect } from "next/navigation";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { Container, Eyebrow } from "@/components/ui";
import { AdminConsole } from "@/components/admin-console";
import { getAdminSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/admin/login");

  return (
    <>
      <Nav />
      <main className="bg-brand-50/30">
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <Container className="relative flex flex-col gap-4 py-12 sm:py-14 md:flex-row md:items-end md:justify-between">
            <div>
              <Eyebrow light>Owner console</Eyebrow>
              <h1 className="mt-3 font-display text-3xl font-extrabold sm:text-4xl">Breathe Pickleball admin</h1>
              <p className="mt-3 max-w-2xl text-white/85">
                Bookings, court availability, users, and revenue — live from Turso.
              </p>
            </div>
            <span className="rounded-full bg-white/12 px-4 py-2 text-xs font-semibold text-white">
              Signed in as {admin.email}
            </span>
          </Container>
        </section>

        <Container className="py-8">
          <AdminConsole />
        </Container>
      </main>
      <Footer />
    </>
  );
}
