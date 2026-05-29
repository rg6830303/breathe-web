import type { Metadata } from "next";
import { Camera, Instagram } from "lucide-react";
import { Footer } from "@/components/footer";
import { Nav } from "@/components/nav";
import { PaddleMark } from "@/components/logo";
import { CTABand, Container, Eyebrow, SectionHeading } from "@/components/ui";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Gallery",
  description: "A look inside Breathe Pickleball, Kaikhali — our courts, coaching sessions, tournaments, and community.",
};

const tiles = [
  { label: "Floodlit evening rallies", tone: "from-brand-700 to-brand-500", span: "sm:col-span-2 sm:row-span-2" },
  { label: "Junior academy in action", tone: "from-brand-500 to-brand-400" },
  { label: "Open tournament finals", tone: "from-brand-800 to-brand-600" },
  { label: "Courtside community", tone: "from-brand-600 to-brand-400" },
  { label: "Coaching drills", tone: "from-brand-700 to-brand-500" },
  { label: "Weekend doubles ladder", tone: "from-brand-500 to-brand-700", span: "sm:col-span-2" },
  { label: "Prize-night celebrations", tone: "from-brand-600 to-brand-800" },
];

export default function GalleryPage() {
  return (
    <>
      <Nav />
      <main>
        <section className="brand-gradient brand-mesh relative overflow-hidden text-white">
          <div className="court-lines absolute inset-0 opacity-25" />
          <Container className="relative py-16 sm:py-20">
            <Eyebrow light>Gallery</Eyebrow>
            <h1 className="mt-3 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-5xl">
              Life at <span className="text-ball">Breathe Pickleball</span>
            </h1>
            <p className="mt-5 max-w-2xl text-white/85 sm:text-lg">
              From first serves to championship points, here's a glimpse of the energy on our courts. For the latest
              photos and reels, follow us on Instagram.
            </p>
          </Container>
        </section>

        <section className="px-4 py-16 sm:px-6 lg:px-8">
          <Container className="!px-0">
            <SectionHeading center eyebrow="Moments" title="Snapshots from the courts" />
            <div className="mt-12 grid auto-rows-[180px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {tiles.map((tile) => (
                <div
                  key={tile.label}
                  className={`group relative overflow-hidden rounded-3xl bg-gradient-to-br ${tile.tone} p-5 shadow-soft ${tile.span ?? ""}`}
                >
                  <div className="court-lines absolute inset-0 opacity-20" />
                  <PaddleMark className="absolute right-4 top-4 h-8 w-8 text-white/40 transition group-hover:scale-110" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/30 to-transparent p-5">
                    <span className="font-display text-sm font-bold text-white">{tile.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-col items-center gap-4 rounded-3xl border border-brand/10 bg-brand/5 p-8 text-center">
              <Camera className="h-8 w-8 text-brand" />
              <h2 className="font-display text-xl font-extrabold text-ink">Tagged us in a great shot?</h2>
              <p className="max-w-md text-sm text-slatey">
                We love resharing our community's best moments. Follow and tag <strong>@breathepickleball</strong> to get featured.
              </p>
              <a
                href={site.instagram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-bold text-white shadow-glow transition hover:bg-brand-600"
              >
                <Instagram className="h-4 w-4" /> Follow on Instagram
              </a>
            </div>
          </Container>
        </section>

        <CTABand />
      </main>
      <Footer />
    </>
  );
}
