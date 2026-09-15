"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PageHero } from "@/components/ui/page-hero";
import { TournamentEntryForm } from "@/components/tournament-entry-form";

/**
 * Team-captain entry — direct link only.
 *
 * Nothing on the site links here and the event it registers for is flagged
 * `unlisted`, so it stays out of the public tournaments tab and the player
 * registration dropdown. The layout marks the page noindex so it does not turn
 * up in search either. Share the URL directly with the people who need it.
 */
export default function TournamentCaptainPage() {
  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen bg-white dark:bg-ink">
        <PageHero
          label="33 Showdown"
          title="Team Captain registration"
          subtitle="Lead a five-player team through the auction and the three-match scoreline. Pay the captain entry online — your spot is confirmed as soon as the payment succeeds."
        />
        <TournamentEntryForm
          source="/api/tournaments/captain"
          category="captain"
          entryLabel="team captain entry"
          showPicker={false}
          emptyTitle="Captain entries are closed"
          emptyBody="Captain registration for 33 Showdown isn't open right now. Get in touch with the club if you think this is a mistake."
        />
      </main>
      <Footer />
    </>
  );
}
