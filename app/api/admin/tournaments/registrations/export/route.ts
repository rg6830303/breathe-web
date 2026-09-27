import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { ensureTournamentSchema } from "@/lib/db/tournament-schema";
import { CASH_AT_VENUE_SOURCE } from "@/lib/tournaments/cash-coupon";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Download LIVE tournament registrations as a real .xlsx workbook.
 *
 * Built server-side from a fresh query (never from whatever the console happens
 * to have cached), so the sheet always reflects the current state. Optional
 * ?tournament_id= exports a single event's draw sheet.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureSchema().catch(() => {});
    await ensureTournamentSchema().catch(() => {});

    const tournamentId = req.nextUrl.searchParams.get("tournament_id");
    // Same rule as the console: real entries only unless ?include=all, so the
    // spreadsheet says what the screen says.
    const includeAll = req.nextUrl.searchParams.get("include") === "all";
    const clauses: string[] = [];
    const args: unknown[] = [];
    if (tournamentId) {
      clauses.push("r.tournament_id = ?");
      args.push(tournamentId);
    }
    if (!includeAll) {
      clauses.push("r.status = 'confirmed' AND (r.amount_paid = r.fee OR r.source = ?)");
      args.push(CASH_AT_VENUE_SOURCE);
    }
    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";

    const res = await turso.execute({
      // r.* so a column that has not been migrated yet cannot fail the export.
      sql: `SELECT r.*,
                   COALESCE(t.name, '—') AS tournament_name, t.event_date
            FROM tournament_registrations r
            LEFT JOIN tournaments t ON t.id = r.tournament_id
            ${where}
            ORDER BY t.event_date ASC, r.created_at ASC
            LIMIT 5000`,
      args,
    });

    const title = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const rows = res.rows.map((r) => ({
      Tournament: String(r.tournament_name ?? "—"),
      "Event date": r.event_date ? String(r.event_date) : "",
      Player: String(r.player_name ?? ""),
      Email: String(r.email ?? ""),
      Phone: r.phone ? String(r.phone) : "",
      Age: r.age ? Number(r.age) : "",
      Sex: r.sex ? title(String(r.sex)) : "",
      "DUPR ID": r.dupr_id ? String(r.dupr_id) : "",
      "DUPR level": r.dupr_level ? String(r.dupr_level) : "",
      // Inline data URLs would blow the sheet up; only a hosted photo is linked.
      Photo: r.photo_url && String(r.photo_url).startsWith("http") ? String(r.photo_url) : "",
      Category: title(String(r.category ?? "")),
      Level: r.skill_level ? title(String(r.skill_level)) : "",
      Partner: r.partner_name ? String(r.partner_name) : "",
      "Entry fee": Number(r.fee) || 0,
      "Amount paid": Number(r.amount_paid) || 0,
      "Payment method": String(r.source ?? "") === CASH_AT_VENUE_SOURCE ? "Cash at venue" : "Online",
      "Due at venue": Math.max(0, (Number(r.fee) || 0) - (Number(r.amount_paid) || 0)),
      Status: title(String(r.status ?? "")),
      // Excel-friendly real Date so it sorts/filters as a date, not text.
      Registered: r.created_at ? new Date(Number(r.created_at)) : "",
      "Payment ref": r.payment_id ? String(r.payment_id) : "",
      Notes: r.notes ? String(r.notes) : "",
    }));

    const sheet = XLSX.utils.json_to_sheet(rows, { cellDates: true });

    // Sensible column widths so the sheet is readable without manual resizing.
    sheet["!cols"] = [
      { wch: 24 }, { wch: 12 }, { wch: 22 }, { wch: 28 }, { wch: 14 },
      { wch: 6 }, { wch: 9 }, { wch: 14 }, { wch: 11 }, { wch: 34 },
      { wch: 14 }, { wch: 13 }, { wch: 20 }, { wch: 10 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 11 }, { wch: 18 }, { wch: 20 }, { wch: 30 },
    ];
    sheet["!autofilter"] = { ref: XLSX.utils.encode_range(XLSX.utils.decode_range(sheet["!ref"] || "A1")) };
    sheet["!freeze"] = { xSplit: 0, ySplit: 1 };

    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Registrations");

    const buf: Buffer = XLSX.write(book, { type: "buffer", bookType: "xlsx" });
    const stamp = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
    const filename = `breathe-tournament-registrations-${stamp}.xlsx`;

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[admin tournament registrations export error]", err);
    return NextResponse.json({ error: "Could not build the spreadsheet." }, { status: 500 });
  }
}
