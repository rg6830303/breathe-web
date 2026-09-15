import { NextResponse } from "next/server";
import { v4 as uuid } from "uuid";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB — the client downscales well below this
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Public upload for the tournament entry photo. Open by design: entries are
 * open to guests, so there is no session to check — the guards are the rate
 * limit, a server-side MIME/extension/size check, and a UUID filename (the
 * client-supplied name is never used).
 *
 * Storage: Vercel Blob when a token is configured, otherwise the (already
 * downscaled) image is handed back as a data URL and stored inline on the
 * registration row. The fallback keeps registration working on a project with
 * no Blob store attached rather than blocking a paying player.
 */
export async function POST(req: Request) {
  try {
    const rl = await checkRateLimit(`tournament-photo:${getClientIp(req)}`, 20, 60 * 1000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: `Too many uploads. Try again in ${rl.retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
      );
    }

    const form = await req.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Please choose a photo." }, { status: 400 });
    }

    const ext = ALLOWED[file.type];
    if (!ext) {
      return NextResponse.json({ error: "Photo must be a JPG, PNG or WebP image." }, { status: 400 });
    }
    if (file.size <= 0 || file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Photo must be under 4 MB." }, { status: 400 });
    }
    // The declared type can lie — check the real magic bytes too.
    const bytes = Buffer.from(await file.arrayBuffer());
    if (!sniff(bytes, file.type)) {
      return NextResponse.json({ error: "That file isn't a valid image." }, { status: 400 });
    }

    const key = `tournament-photos/${uuid()}.${ext}`;

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import("@vercel/blob");
        const blob = await put(key, bytes, { access: "public", contentType: file.type });
        return NextResponse.json({ url: blob.url });
      } catch (blobErr) {
        console.error("[tournament photo blob error]", blobErr);
        // fall through to the inline data URL
      }
    }

    return NextResponse.json({ url: `data:${file.type};base64,${bytes.toString("base64")}` });
  } catch (err) {
    console.error("[tournament photo error]", err);
    return NextResponse.json({ error: "Could not upload that photo. Please try again." }, { status: 500 });
  }
}

/** Magic-byte check so a renamed .exe can't ride in as image/jpeg. */
function sniff(b: Buffer, mime: string): boolean {
  if (b.length < 12) return false;
  if (mime === "image/jpeg") return b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (mime === "image/png") return b.subarray(0, 8).toString("hex") === "89504e470d0a1a0a";
  if (mime === "image/webp") return b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP";
  return false;
}
