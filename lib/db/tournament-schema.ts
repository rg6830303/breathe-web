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

/** Stable id so the seed is idempotent across deploys and both engines. */
export const SHOWDOWN_33_ID = "tour-33-showdown";

const STATEMENTS: string[] = [
  // Player detail captured by the public entry form.
  `ALTER TABLE tournament_registrations ADD COLUMN age INTEGER`,
  `ALTER TABLE tournament_registrations ADD COLUMN sex TEXT`,
  `ALTER TABLE tournament_registrations ADD COLUMN photo_url TEXT`,
  `ALTER TABLE tournament_registrations ADD COLUMN dupr_id TEXT`,
  `ALTER TABLE tournament_registrations ADD COLUMN dupr_level TEXT`,
  // Poster artwork shown on the public tournaments tab.
  `ALTER TABLE tournaments ADD COLUMN poster_url TEXT`,
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

/** Seed the 33 Showdown event so the public tab has something to register for. */
async function seedShowdown() {
  const now = Date.now();
  try {
    await turso.execute({
      sql: `INSERT OR IGNORE INTO tournaments
              (id, name, event_date, format, prize, fee, description, poster_url, status, active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', 1, ?, ?)`,
      args: [
        SHOWDOWN_33_ID,
        "33 Showdown",
        "2026-10-04",
        "Auction format · 5 players per team · B,C doubles → B singles → B,C doubles",
        "₹40,000 prize pool",
        1200,
        "One scoreline, three matches — whoever's team touches thirty three first wins it. Sunday 4th October at Panchwati Complex, Kaikhali. Limited slots.",
        "/photos/33-showdown-poster.jpg",
        now,
        now,
      ],
    });
  } catch (err) {
    console.error("[tournament seed]", err);
  }
}

export function ensureTournamentSchema(): Promise<void> {
  if (done) return Promise.resolve();
  if (running) return running;
  running = (async () => {
    try {
      for (const sql of STATEMENTS) await quietly(sql);
      await quietly(NULLABLE_USER_ID);
      await quietly(EMAIL_UNIQUE);
      await seedShowdown();
      done = true;
    } finally {
      running = null;
    }
  })();
  return running;
}
