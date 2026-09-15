import type { Metadata } from "next";

/**
 * Direct-link page: kept out of search results and out of the sitemap, since it
 * is shared by URL rather than browsed to from the site.
 */
export const metadata: Metadata = {
  title: "Team Captain Registration · 33 Showdown",
  description: "Captain entry for the 33 Showdown at Breathe Pickleball, Kaikhali.",
  robots: { index: false, follow: false },
};

export default function TournamentCaptainLayout({ children }: { children: React.ReactNode }) {
  return children;
}
