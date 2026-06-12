import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { sendMail } from "@/lib/mailer";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";

export const runtime = "nodejs";
export const maxDuration = 60; // bulk send may take longer
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json().catch(() => ({}));
    const { subject, description, recipients } = body;

    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required." }, { status: 400 });
    }
    if (!description || !description.trim()) {
      return NextResponse.json({ error: "Message content is required." }, { status: 400 });
    }
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ error: "At least one recipient is required." }, { status: 400 });
    }

    // Determine unique emails to send to
    let targetEmails: string[] = [];

    if (recipients.includes("all")) {
      // Fetch all users
      await ensureSchema().catch(() => {});
      const byEmail = new Set<string>();

      // Turso
      try {
        const result = await turso.execute("SELECT email FROM users");
        for (const row of result.rows) {
          if (row.email) byEmail.add(String(row.email).toLowerCase().trim());
        }
      } catch (err) {
        console.error("[outreach users fetch error]", err);
      }

      // Supabase
      try {
        const { supabase, hasSupabase } = require("@/lib/supabase");
        if (hasSupabase) {
          const { data, error } = await supabase.from("users").select("email");
          if (data && !error) {
            for (const u of data) {
              if (u.email) byEmail.add(String(u.email).toLowerCase().trim());
            }
          }
        }
      } catch (err) {
        console.error("[outreach supabase fetch error]", err);
      }

      targetEmails = Array.from(byEmail);
    } else {
      // Recipients are specific emails passed from frontend
      targetEmails = recipients.map(e => String(e).toLowerCase().trim()).filter(Boolean);
    }

    if (targetEmails.length === 0) {
      return NextResponse.json({ error: "No users found to email." }, { status: 400 });
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in";

    let successCount = 0;
    let failCount = 0;

    // Send emails sequentially or in small parallel batches to avoid SMTP limits/blocks
    for (const email of targetEmails) {
      try {
        const res = await sendMail({
          to: email,
          subject: subject.trim(),
          text: `${description.trim()}\n\n— Breathe Pickleball\n${siteUrl}`,
          html:
            `<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0d1426">` +
            `<div style="text-align:center;margin-bottom:16px"><img src="${siteUrl}/icons/icon-192.png" alt="Breathe Pickleball" width="64" height="64" style="border-radius:16px"/></div>` +
            `<div style="background-color:#f8fafc;border-radius:16px;padding:24px;border:1px solid #e2e8f0;margin-bottom:20px">` +
            `<h2 style="margin-top:0;color:#0f172a;font-size:20px;border-bottom:1px solid #e2e8f0;padding-bottom:12px">${subject.trim()}</h2>` +
            `<div style="color:#334155;line-height:1.6;font-size:15px;white-space:pre-wrap">${description.trim()}</div>` +
            `</div>` +
            `<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0"/>` +
            `<p style="color:#94a3b8;font-size:12px;line-height:1.6;text-align:center">` +
            `Breathe Pickleball · Panchwati Complex, Kaikhali, Kolkata<br/>` +
            `<a href="${siteUrl}" style="color:#2F5BFF">${siteUrl.replace(/^https?:\/\//, "")}</a></p>` +
            `</div>`,
        });

        if (res.ok) {
          successCount++;
        } else {
          failCount++;
          console.error(`[outreach send fail] to ${email}:`, res.error);
        }
      } catch (err) {
        failCount++;
        console.error(`[outreach send error] to ${email}:`, err);
      }
    }

    return NextResponse.json({
      ok: true,
      total: targetEmails.length,
      successCount,
      failCount,
    });
  } catch (err: unknown) {
    console.error("[outreach API error]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
