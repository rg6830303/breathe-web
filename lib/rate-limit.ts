import { turso } from "@/lib/turso";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

export async function checkRateLimit(
  key: string,
  maxAttempts: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();
  const windowStart = now - windowMs;

  let row: { count: number; window_start: number } | null = null;
  try {
    const result = await turso.execute({
      sql: "SELECT count, window_start FROM rate_limits WHERE key = ? LIMIT 1",
      args: [key],
    });
    if (result.rows.length > 0) {
      const r = result.rows[0];
      row = { count: Number(r.count), window_start: Number(r.window_start) };
    }
  } catch (err) {
    console.error("[rate-limit read error]", err);
    // Fail-open if the table is missing or unreachable — better than locking everyone out.
    return { ok: true };
  }

  if (!row) {
    try {
      await turso.execute({
        sql: "INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)",
        args: [key, now],
      });
    } catch (err) {
      console.error("[rate-limit insert error]", err);
    }
    return { ok: true };
  }

  if (row.window_start <= windowStart) {
    try {
      await turso.execute({
        sql: "UPDATE rate_limits SET count = 1, window_start = ? WHERE key = ?",
        args: [now, key],
      });
    } catch (err) {
      console.error("[rate-limit reset error]", err);
    }
    return { ok: true };
  }

  if (row.count >= maxAttempts) {
    const retryAfterSec = Math.max(1, Math.ceil((row.window_start + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  try {
    await turso.execute({
      sql: "UPDATE rate_limits SET count = count + 1 WHERE key = ?",
      args: [key],
    });
  } catch (err) {
    console.error("[rate-limit increment error]", err);
  }
  return { ok: true };
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return "unknown";
}
