import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand } from "@/components/ui";
import type { Notice } from "@/lib/types";
import { HomeMotion } from "@/components/home-motion";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";

// Render on-demand (not at build time). The homepage reads live notices from
// the DB; prerendering it during `next build` opens a Postgres connection in the
// build container, whose pool can surface a connection error as an unhandled
// rejection and crash the export worker ("Export encountered an error on /").
// force-dynamic keeps it out of the static-export step — it still SSRs full HTML
// for crawlers, and DB errors at request time fall back gracefully.
export const dynamic = "force-dynamic";

async function getLiveNotices(): Promise<Notice[]> {
  try {
    // Self-heal the schema so a fresh/legacy DB has the notices table before we
    // query it (otherwise the homepage logs "no such table: notices").
    await ensureSchema();
    const result = await turso.execute({
      sql: `SELECT id, title, body, category, active, created_at, updated_at
            FROM notices
            WHERE active = 1
            ORDER BY created_at DESC
            LIMIT 6`,
      args: [],
    });
    return result.rows.map((r) => ({
      id: String(r.id),
      title: String(r.title),
      content: String(r.body ?? ""),
      type: (["daily", "weekly", "monthly"].includes(String(r.category))
        ? String(r.category)
        : "daily") as Notice["type"],
      created_at: String(r.created_at),
      updated_at: String(r.updated_at),
    }));
  } catch (err) {
    console.error("[homepage notices error]", err);
    // Graceful fallback — show no notices if DB unreachable
    return [];
  }
}

export default async function Home() {
  const notices = await getLiveNotices();

  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
        <HomeMotion notices={notices} />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
