"use client";

import Image from "next/image";
import { TournamentEntryForm } from "@/components/tournament-entry-form";
import { site } from "@/lib/site";

/**
 * Team-captain entry — a standalone page, not part of the website.
 *
 * Deliberately renders no Nav and no Footer: this is handed out as its own
 * link (33showdown.vercel.app serves it at the root and rewrites every other
 * path here), so there is nothing to navigate to. The only outbound links are
 * the club's phone number and Instagram, for someone who needs to ask a
 * question before paying. Marked noindex in the layout.
 */
export default function TournamentCaptainPage() {
  return (
    <main className="app-surface min-h-screen bg-white dark:bg-ink">
      {/* Brand mark only — no menu, nothing that leads into the site. */}
      <header className="flex items-center justify-center border-b border-ink/5 px-4 py-5 dark:border-white/10">
        <Image
          src="/breathe-logo-nav.png"
          alt="Breathe Pickleball"
          width={220}
          height={100}
          priority
          className="h-10 w-auto object-contain"
        />
      </header>

      <div className="pt-6 sm:pt-10">
        <TournamentEntryForm
          source="/api/tournaments/captain"
          category="captain"
          entryLabel="team captain entry"
          showPicker={false}
          showBackLink={false}
          emptyTitle="Captain entries are closed"
          emptyBody="Captain registration for 33 Showdown isn't open right now. Get in touch with the club if you think this is a mistake."
        />
      </div>

      <footer className="border-t border-ink/5 px-4 py-8 text-center dark:border-white/10">
        <p className="text-xs text-slatey dark:text-white/45">
          Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata
        </p>
        <p className="mt-2 text-xs text-slatey dark:text-white/45">
          Questions?{" "}
          <a href={site.phoneHref} className="font-bold text-brand dark:text-lime">
            {site.phoneDisplay}
          </a>
        </p>
      </footer>
    </main>
  );
}
