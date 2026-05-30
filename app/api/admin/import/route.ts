import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";

function validateRow(row: any) {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  
  const errors: string[] = [];
  
  const date = String(row.date ?? "").trim();
  const time = String(row.time ?? "").trim();
  const duration = Number(row.duration_min ?? 60);
  const name = String(row.customer_name ?? "").trim();
  const phone = String(row.customer_phone ?? "").trim();
  const email = row.customer_email ? String(row.customer_email).trim() : null;
  const amount = Number(row.amount ?? 0);
  const status = String(row.status ?? "confirmed").toLowerCase().trim();
  const notes = row.notes ? String(row.notes).trim() : null;

  if (!date || !dateRegex.test(date)) {
    errors.push("Date must be in YYYY-MM-DD format.");
  }
  if (!time || !timeRegex.test(time.slice(0, 5))) {
    errors.push("Time must be in HH:MM (24h) format.");
  }
  if (isNaN(duration) || duration < 30 || duration > 240) {
    errors.push("Duration must be between 30 and 240 minutes.");
  }
  if (!name) {
    errors.push("Customer name is required.");
  }
  if (!phone || phone.length < 8) {
    errors.push("Valid customer phone is required.");
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push("Enter a valid customer email.");
  }
  if (isNaN(amount) || amount < 0) {
    errors.push("Amount must be a non-negative number.");
  }
  if (!["confirmed", "cancelled", "no_show"].includes(status)) {
    errors.push("Status must be confirmed, cancelled, or no_show.");
  }
  
  return {
    success: errors.length === 0,
    errors,
    data: {
      date,
      time: time.slice(0, 5),
      duration_min: isNaN(duration) ? 60 : duration,
      customer_name: name,
      customer_phone: phone,
      customer_email: email,
      amount: isNaN(amount) ? 0 : amount,
      status: (status as "confirmed" | "cancelled" | "no_show"),
      notes
    }
  };
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const rawRows = Array.isArray(body.rows) ? body.rows : [];
    
    const valid = [];
    const errors = [];
    
    for (let idx = 0; idx < rawRows.length; idx++) {
      const res = validateRow(rawRows[idx]);
      if (res.success) {
        valid.push(res.data);
      } else {
        errors.push({ 
          index: idx + 1, 
          row: rawRows[idx], 
          error: res.errors.join(" ") 
        });
      }
    }

    let imported = 0;
    let skipped = 0;
    const now = Date.now();

    // Ingest deduplicated rows into database
    for (const r of valid) {
      let dup;
      try {
        dup = await turso.execute({
          sql: `SELECT id FROM bookings 
                WHERE slot_date = ? 
                  AND slot_time = ? 
                  AND guest_phone = ? 
                  AND status = 'confirmed'
                LIMIT 1`,
          args: [r.date, r.time, r.customer_phone]
        });
      } catch (dbErr) {
        console.error("[import db-dup check error]", dbErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }

      if (dup.rows.length > 0) {
        skipped++;
        continue;
      }

      try {
        await turso.execute({
          sql: `INSERT INTO bookings (
            id, user_id, slot_date, slot_time, duration_min, 
            guest_name, guest_phone, guest_email, amount_paid, 
            status, source, notes, created_at
          ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'import', ?, ?)`,
          args: [
            uuid(),
            r.date,
            r.time,
            r.duration_min,
            r.customer_name,
            r.customer_phone,
            r.customer_email,
            r.amount,
            r.status,
            r.notes,
            now
          ]
        });
        imported++;
      } catch (dbErr) {
        console.error("[import db-insert error]", dbErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      imported, 
      skipped, 
      errors: errors.length,
      errorDetails: errors
    });
  } catch (err: unknown) {
    console.error("[bookings import error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
