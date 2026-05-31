import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters.").max(200),
});

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = await checkRateLimit(`admin-change-pw:${ip}`, 5, 15 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${rl.retryAfterSec}s.` },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input." }, { status: 400 });
  }

  let row;
  try {
    const result = await turso.execute({
      sql: "SELECT password_hash FROM admins WHERE id = ? LIMIT 1",
      args: [admin.id],
    });
    row = result.rows[0];
  } catch (err) {
    console.error("[admin change-password lookup error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  if (!row) return NextResponse.json({ error: "Admin account missing." }, { status: 404 });

  const ok = await bcrypt.compare(parsed.data.currentPassword, String(row.password_hash));
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 401 });

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  try {
    await turso.execute({
      sql: "UPDATE admins SET password_hash = ? WHERE id = ?",
      args: [newHash, admin.id],
    });
  } catch (err) {
    console.error("[admin change-password update error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
