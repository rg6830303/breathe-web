"use client";

import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { PageHero } from "@/components/ui/page-hero";
import { TournamentEntryForm } from "@/components/tournament-entry-form";

export default function TournamentRegisterPage() {
  return (
    <>
      <Nav />
      <main className="app-surface min-h-screen bg-white dark:bg-ink">
        <PageHero
          label="Tournaments"
          title="Register your entry"
          subtitle="Secure your spot — no account needed. Pay the entry fee online and we'll email your confirmation and the match schedule."
        />
        <TournamentEntryForm
          source="/api/tournaments"
          category="singles"
          entryLabel="player entry"
          emptyTitle="No tournaments open right now"
          emptyBody="Registrations open ahead of each event. Follow us on Instagram or check back soon — the next Breathe Open will appear here."
        />
      </main>
      <Footer />
    </>
  );
}
