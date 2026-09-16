import { turso } from "@/lib/turso";

/**
 * Tournament-specific schema top-ups.
 *
 * `ensureSchema()` short-circuits as soon as `users` exists, so on an already
 * provisioned database its ALTER list never runs again. Columns added after the
 * first deploy therefore need their own idempotent migration — that's this.
 *
 * Every statement is run with errors swallowed: "duplicate column" (SQLite) /
 * "already exists" (Postgres) are the normal outcome once the migration has run.
 * Memoised per serverless instance so it costs one round-trip on a cold start.
 */

/** Stable ids so the seeds are idempotent across deploys and both engines. */
export const SHOWDOWN_33_ID = "tour-33-showdown";
/** Team-captain entry — same event, higher fee, kept off the public listing. */
export const SHOWDOWN_33_CAPTAIN_ID = "tour-33-showdown-captain";

/**
 * Create the tournament tables if production never got them.
 *
 * This is the important one. `ensureSchema()` returns early the moment `users`
 * exists, so on a database provisioned before these tables were added to
 * SCHEMA_TABLES, applySchema() never runs and the tables are simply absent —
 * every ALTER below fails with "relation does not exist", every INSERT from the
 * registration flow fails, and the admin console reads nothing. Written in
 * Postgres-valid DDL (BIGINT for epoch-ms columns, which overflow INT4).
 */
const CREATE_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS tournaments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    event_date TEXT,
    format TEXT,
    prize TEXT,
    fee INTEGER DEFAULT 0,
    description TEXT,
    poster_url TEXT,
    unlisted INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'upcoming',
    active INTEGER NOT NULL DEFAULT 1,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS tournament_registrations (
    id TEXT PRIMARY KEY,
    tournament_id TEXT NOT NULL,
    user_id TEXT,
    player_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    age INTEGER,
    sex TEXT,
    photo_url TEXT,
    dupr_id TEXT,
    dupr_level TEXT,
    category TEXT NOT NULL DEFAULT 'singles',
    skill_level TEXT,
    partner_name TEXT,
    notes TEXT,
    fee INTEGER NOT NULL DEFAULT 0,
    amount_paid INTEGER NOT NULL DEFAULT 0,
    payment_id TEXT,
    status TEXT NOT NULL DEFAULT 'confirmed',
    created_at BIGINT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_regs_tournament ON tournament_registrations (tournament_id, created_at DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_tournament_regs_user ON tournament_registrations (user_id)`,
];

const STATEMENTS: string[] = [
  // Player detail captured by the public entry form.
  `ALTER TABLE tournament_registrations ADD COLUMN age INTEGER`,
  `ALTER TABLE tournament_registrations ADD COLUMN sex TEXT`,
  `ALTER TABLE tournament_registrations ADD COLUMN photo_url TEXT`,
  `ALTER TABLE tournament_registrations ADD COLUMN dupr_id TEXT`,
  `ALTER TABLE tournament_registrations ADD COLUMN dupr_level TEXT`,
  // Poster artwork shown on the public tournaments tab.
  `ALTER TABLE tournaments ADD COLUMN poster_url TEXT`,
  // 1 = reachable by direct link only: hidden from /api/tournaments and so from
  // the public tab and the player registration dropdown.
  `ALTER TABLE tournaments ADD COLUMN unlisted INTEGER DEFAULT 0`,
];

/**
 * Guests (no account) register too, so user_id must accept NULL. SQLite cannot
 * drop a NOT NULL in place; its tournament_registrations is only ever created
 * fresh by newer code paths, and Postgres is the production engine.
 */
const NULLABLE_USER_ID = `ALTER TABLE tournament_registrations ALTER COLUMN user_id DROP NOT NULL`;

/**
 * Duplicate guard that works for guests: user_id is NULL for them and NULL is
 * distinct from NULL in both engines, so the original (tournament, user, category)
 * index can't hold them. Email is the stable identity across both kinds of entry.
 */
const EMAIL_UNIQUE = `CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_regs_email_unique
  ON tournament_registrations (tournament_id, email, category) WHERE status = 'confirmed'`;

let done = false;
let running: Promise<void> | null = null;

async function quietly(sql: string) {
  try {
    await turso.execute(sql);
  } catch (err) {
    const msg = String((err as Error)?.message ?? "").toLowerCase();
    const benign =
      msg.includes("duplicate column") ||
      msg.includes("already exists") ||
      msg.includes("duplicate key") ||
      msg.includes("near \"alter\"") ||
      msg.includes("syntax error");
    if (!benign) console.error("[tournament schema]", sql.slice(0, 60), err);
  }
}

/** Seed the 33 Showdown events so the public tab has something to register for. */
async function seedShowdown() {
  const now = Date.now();
  const base = {
    date: "2026-10-04",
    format: "Auction format · 5 players per team · B,C doubles → B singles → B,C doubles",
    prize: "₹40,000 prize pool",
    poster: "/photos/33-showdown-poster.jpg",
  };
  const rows: Array<[string, string, number, number, string]> = [
    [
      SHOWDOWN_33_ID,
      "33 Showdown",
      1200,
      0,
      "One scoreline, three matches — whoever's team touches thirty three first wins it. Sunday 4th October at Panchwati Complex, Kaikhali. Limited slots.",
    ],
    [
      SHOWDOWN_33_CAPTAIN_ID,
      "33 Showdown — Team Captain",
      3000,
      1,
      "Captain entry for 33 Showdown: lead a five-player team through the auction and the three-match scoreline. Sunday 4th October at Panchwati Complex, Kaikhali.",
    ],
  ];

  for (const [id, name, fee, unlisted, description] of rows) {
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO tournaments
                (id, name, event_date, format, prize, fee, description, poster_url, unlisted,
                 status, active, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', 1, ?, ?)`,
        args: [id, name, base.date, base.format, base.prize, fee, description, base.poster, unlisted, now, now],
      });
    } catch (err) {
      console.error("[tournament seed]", id, err);
    }
  }
}

/**
 * Remove the stale hand-entered "33 Showdown" duplicate that predates the seed
 * and showed up twice in the registration dropdown.
 *
 * Addressed by its exact id — matching on the name did not take — and guarded
 * by NOT EXISTS so a row with any registration against it is never touched.
 * NOT EXISTS rather than NOT IN: a single NULL tournament_id anywhere in
 * tournament_registrations makes a NOT IN subquery match nothing, silently.
 */
export const STALE_TOURNAMENT_IDS = ["e5122842-4833-42ec-916f-820cbb2e1c4a"];

async function dropStaleShowdownDuplicates() {
  for (const id of STALE_TOURNAMENT_IDS) {
    if (id === SHOWDOWN_33_ID || id === SHOWDOWN_33_CAPTAIN_ID) continue;
    try {
      await turso.execute({
        sql: `DELETE FROM tournaments
              WHERE id = ?
                AND NOT EXISTS (
                  SELECT 1 FROM tournament_registrations r WHERE r.tournament_id = tournaments.id
                )`,
        args: [id],
      });
    } catch (err) {
      console.error("[tournament duplicate cleanup]", id, err);
    }
  }
}

export function ensureTournamentSchema(): Promise<void> {
  if (done) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    try {
      // Tables first — the ALTERs and every query below are meaningless if the
      // tables were never created on this database.
      for (const sql of CREATE_TABLES) await quietly(sql);
      for (const sql of STATEMENTS) await quietly(sql);
      await quietly(NULLABLE_USER_ID);
      await quietly(EMAIL_UNIQUE);
      await seedShowdown();
      await dropStaleShowdownDuplicates();
      done = true;
    } finally {
      running = null;
    }
  })();
  return running;
}
