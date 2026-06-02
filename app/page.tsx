import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { CTABand } from "@/components/ui";
import type { Notice } from "@/lib/types";
import { HomeMotion } from "@/components/home-motion";
import { turso } from "@/lib/turso";

// ISR: serve a fast, cached static homepage (revalidated hourly) so Googlebot
// always gets quick, reliable HTML — better for indexing than force-dynamic,
// and resilient if the DB is briefly unreachable during a crawl.
export const revalidate = 3600;

async function getLiveNotices(): Promise<Notice[]> {
  try {
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
