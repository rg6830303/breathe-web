import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PageHero } from "@/components/ui/page-hero";
import { CTABand } from "@/components/ui";
import { GalleryGrid, type InstaPost } from "@/components/gallery-grid";

export const revalidate = 3600;

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
  const posts = await getInstagramPosts();
  return (
    <>
      <Nav />
      <main className="overflow-x-hidden">
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
