// ─────────────────────────────────────────────────────────────────────────────
// Central registry of the real club photos used across the marketing site.
// Single source of truth so every page references the same files + alt text.
//
// All files live in /public/photos as optimized JPGs (downscaled to 1600px on
// the long edge, ~120–320 KB; see scripts/optimize-photos.mjs). Five court
// shots ship with the repo plus these five club shots:
//
//   community-women.jpg     — group of players on the floodlit court at night
//   players-action.jpg      — two players mid-rally on the blue court
//   community-court.jpg     — friends courtside at dusk, paddles in hand
//   breathe-kitchen.jpg     — the courtside "Breathe Kitchen" cafe counter
//   tournament-winners.jpg  — Breathe Battle champions with the trophy
//
// Until a file exists the <SmartImage> wrapper shows an on-brand court
// placeholder, so the build and layout never break on a missing photo.
// ─────────────────────────────────────────────────────────────────────────────

export type Photo = {
  src: string;
  alt: string;
  /** Rough orientation — lets layouts pick aspect ratios sensibly. */
  shape: "portrait" | "landscape" | "square";
};

const P = (file: string, alt: string, shape: Photo["shape"]): Photo => ({
  src: `/photos/${file}`,
  alt,
  shape,
});

export const photos = {
  // ── Ship with the repo ───────────────────────────────────────────────
  courtAerial1: P("court-aerial-1.jpg", "Aerial view of the Breathe Pickleball courts", "landscape"),
  courtAerial2: P("court-aerial-2.jpg", "Players rallying on the floodlit courts from above", "landscape"),
  courtAerial3: P("court-aerial-3.jpg", "The three-court complex at Breathe Pickleball", "landscape"),
  courtNight: P("court-night-wide.jpg", "Breathe Pickleball courts lit up at night", "landscape"),
  courtPortrait: P("court-portrait.jpg", "A floodlit Breathe Pickleball court", "portrait"),

  // ── Added by the owner ───────────────────────────────────────────────
  communityWomen: P("community-women.jpg", "A group of players courtside under the floodlights", "portrait"),
  playersAction: P("players-action.jpg", "Two players mid-rally on the blue court", "portrait"),
  communityCourt: P("community-court.jpg", "Friends courtside at dusk with their paddles", "portrait"),
  kitchen: P("breathe-kitchen.jpg", "The courtside Breathe Kitchen cafe counter", "portrait"),
  tournamentWinners: P("tournament-winners.jpg", "Breathe Battle champions with the trophy", "portrait"),
} as const;

/** Curated set that stands in for the old gallery, spread across the site. */
export const communityPhotos: Photo[] = [
  photos.communityWomen,
  photos.playersAction,
  photos.tournamentWinners,
  photos.communityCourt,
  photos.courtNight,
  photos.kitchen,
];
