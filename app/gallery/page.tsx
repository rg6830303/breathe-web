import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PageHero } from "@/components/ui/page-hero";
import { CTABand } from "@/components/ui";
import { GalleryGrid, type InstaPost } from "@/components/gallery-grid";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gallery",
  description:
    "See Breathe Pickleball in action — floodlit courts, rallies, and tournaments at our Kaikhali venue in North Kolkata. A glimpse of the energy on our three pro courts.",
  alternates: { canonical: "/gallery" },
  openGraph: {
    title: "Gallery | Breathe Pickleball, Kaikhali",
    description: "Floodlit courts, rallies, and tournaments at Breathe Pickleball, North Kolkata.",
    url: "/gallery",
  },
};

export const revalidate = 60; // short cache so new uploads show up fast

async function getGalleryImages(): Promise<InstaPost[] | null> {
  try {
    await ensureSchema();
    const result = await turso.execute({
      sql: "SELECT id, blob_url, caption, created_at FROM gallery_images WHERE active = 1 ORDER BY display_order ASC, created_at DESC",
      args: [],
    });
    
    if (result.rows.length === 0) return null;
    
    return result.rows.map((row) => ({
      id: String(row.id),
      caption: row.caption ? String(row.caption) : undefined,
      media_type: "IMAGE" as const,
      media_url: String(row.blob_url),
      thumbnail_url: String(row.blob_url),
      permalink: String(row.blob_url),
      timestamp: new Date(Number(row.created_at)).toISOString(),
    }));
  } catch (err) {
    console.error("[getGalleryImages error]", err);
    return null;
  }
}

async function getInstagramPosts(): Promise<InstaPost[] | null> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp&limit=24&access_token=${token}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: InstaPost[] };
    const items = (data.data ?? []).filter((p) => p.media_type !== "VIDEO");
    return items.length ? items : null;
  } catch {
    return null;
  }
}

export default async function GalleryPage() {
  // First, check for hosted images in our Vercel Blob/Turso database
  let posts = await getGalleryImages();
  
  // If none are uploaded, fall back to Instagram API
  if (!posts || posts.length === 0) {
    posts = await getInstagramPosts();
  }

  return (
    <>
      <Nav />
      <main className="overflow-x-hidden min-h-screen bg-brand-50/10">
        <PageHero
          dark
          label="Gallery"
          title="Life at Breathe Pickleball"
          subtitle="From first serves to championship points, here's a glimpse of the energy on our courts."
        />
        <GalleryGrid posts={posts} />
        <CTABand />
      </main>
      <Footer />
    </>
  );
}
