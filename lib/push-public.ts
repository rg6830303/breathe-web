// Web-push constants safe for the CLIENT bundle (no secrets here).
// The PUBLIC VAPID key is, by design, public — it ships to browsers as the
// applicationServerKey. The matching PRIVATE key lives ONLY in the server env
// (VAPID_PRIVATE_KEY) and is never imported here. Override the public key per
// environment with NEXT_PUBLIC_VAPID_PUBLIC_KEY if you rotate the pair.
export const VAPID_PUBLIC_KEY_DEFAULT =
  "BPAZHLXp_OsSjmFvwJASm_cmJSfl-BNjyPVbPJfwUjY4KHBWddNnp5qOVkQzolai-722LD6CZSlvsiCejGByD7E";

export function getVapidPublicKey(): string {
  // Trim — a stray space/newline pasted into NEXT_PUBLIC_VAPID_PUBLIC_KEY makes
  // the decoded applicationServerKey the wrong length, which the browser
  // rejects with AbortError on subscribe().
  return (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY_DEFAULT).trim();
}

/** Convert a base64url VAPID public key into the Uint8Array the Push API wants. */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
