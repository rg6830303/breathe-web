import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { turso } from "@/lib/turso";

export const runtime = "nodejs";

export async function GET() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) {
    return NextResponse.json(
      { ok: false, error: "ADMIN_EMAIL and ADMIN_PASSWORD env vars are required." },
      { status: 400 },
    );
  }

  const schemaPath = path.join(process.cwd(), "lib", "db", "schema.sql");
  const schema = await readFile(schemaPath, "utf8");
  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    await turso.execute(statement);
  }

  const existing = await turso.execute({
    sql: "SELECT id FROM admins WHERE email = ? LIMIT 1",
    args: [adminEmail.toLowerCase()],
  });
  if (existing.rows.length === 0) {
    const hash = await bcrypt.hash(adminPassword, 12);
    await turso.execute({
      sql: "INSERT INTO admins (id, email, password_hash, name) VALUES (?, ?, ?, ?)",
      args: [uuid(), adminEmail.toLowerCase(), hash, "Club Admin"],
    });
  }

  return NextResponse.json({ ok: true, message: "Database initialized" });
}
