import { NextResponse } from "next/server";
import { put, del } from "@vercel/blob";
import { getAdminSession } from "@/lib/auth";
import { turso } from "@/lib/turso";
import { ensureSchema } from "@/lib/db/ensure";
import { v4 as uuid } from "uuid";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET() {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let result;
    try {
      result = await turso.execute({
        sql: "SELECT id, blob_url, caption, display_order, active, created_at FROM gallery_images ORDER BY display_order ASC, created_at DESC",
        args: [],
      });
    } catch (dbErr) {
      console.error("[admin gallery fetch db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const images = result.rows.map((row) => ({
      id: String(row.id),
      blobUrl: String(row.blob_url),
      caption: row.caption ? String(row.caption) : null,
      displayOrder: Number(row.display_order) || 0,
      active: Number(row.active) || 1,
      createdAt: Number(row.created_at),
    }));

    return NextResponse.json({ images });
  } catch (err: unknown) {
    console.error("[admin gallery fetch error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureSchema();
    const form = await req.formData();
    const files = form.getAll("files") as File[];
    const captions = form.getAll("captions") as string[];
    const results = [];
    const now = Date.now();

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f || !f.type.startsWith("image/")) continue;
      if (f.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: `File ${f.name} exceeds 5MB size limit.` }, { status: 400 });
      }

      let blob;
      try {
        blob = await put(`gallery/${now}-${f.name}`, f, {
          access: "public",
          contentType: f.type,
        });
      } catch (blobErr) {
        console.error("[vercel blob upload error]", blobErr);
        return NextResponse.json({ error: "Failed to upload file to storage." }, { status: 500 });
      }

      const id = uuid();
      const caption = captions[i] ? String(captions[i]).trim() : null;
      
      try {
        await turso.execute({
          sql: "INSERT INTO gallery_images (id, blob_url, caption, display_order, active, created_at) VALUES (?, ?, ?, 0, 1, ?)",
          args: [id, blob.url, caption, now],
        });
      } catch (dbErr) {
        console.error("[gallery insert db error]", dbErr);
        // clean up uploaded blob if db write fails
        await del(blob.url).catch((e) => console.error("[vercel blob cleanup error]", e));
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }

      results.push({
        id,
        blobUrl: blob.url,
        caption,
        displayOrder: 0,
        active: 1,
        createdAt: now,
      });
    }

    return NextResponse.json({ uploaded: results });
  } catch (err: unknown) {
    console.error("[gallery upload error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    if (Array.isArray(body.order)) {
      // Reorder: body.order is an array of { id, display_order } in the new order
      try {
        for (let i = 0; i < body.order.length; i++) {
          const item = body.order[i];
          if (!item?.id) continue;
          await turso.execute({
            sql: "UPDATE gallery_images SET display_order = ? WHERE id = ?",
            args: [i, String(item.id)],
          });
        }
      } catch (dbErr) {
        console.error("[gallery reorder db error]", dbErr);
        return NextResponse.json({ error: "Could not save order." }, { status: 500 });
      }
      return NextResponse.json({ ok: true });
    }

    const id = body.id ? String(body.id) : "";
    if (!id) return NextResponse.json({ error: "Image ID is required." }, { status: 400 });

    const updates: string[] = [];
    const args: (string | number | null)[] = [];
    if (typeof body.caption === "string") {
      updates.push("caption = ?");
      args.push(body.caption.trim() || null);
    }
    if (typeof body.active === "boolean") {
      updates.push("active = ?");
      args.push(body.active ? 1 : 0);
    }
    if (typeof body.display_order === "number") {
      updates.push("display_order = ?");
      args.push(body.display_order);
    }
    if (updates.length === 0) return NextResponse.json({ ok: true });
    args.push(id);

    try {
      await turso.execute({
        sql: `UPDATE gallery_images SET ${updates.join(", ")} WHERE id = ?`,
        args,
      });
    } catch (dbErr) {
      console.error("[gallery patch db error]", dbErr);
      return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[gallery patch error]", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const admin = await getAdminSession();
    if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await req.json().catch(() => ({}));
    if (!id) return NextResponse.json({ error: "Image ID is required." }, { status: 400 });

    let result;
    try {
      result = await turso.execute({
        sql: "SELECT id, blob_url FROM gallery_images WHERE id = ? LIMIT 1",
        args: [id],
      });
    } catch (dbErr) {
      console.error("[gallery delete db-fetch error]", dbErr);
      return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
    }

    const row = result.rows[0];
    if (row) {
      const blobUrl = String(row.blob_url);
      await del(blobUrl).catch((e) => console.error("[blob deletion warning]", e));
      
      try {
        await turso.execute({
          sql: "DELETE FROM gallery_images WHERE id = ?",
          args: [id],
        });
      } catch (dbErr) {
        console.error("[gallery delete db error]", dbErr);
        return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    console.error("[gallery deletion error]", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
