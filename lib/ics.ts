// RFC 5545 minimal VCALENDAR generator. Produces an importable .ics string
// for a single confirmed booking (Apple Calendar, Google Calendar, Outlook
// all accept this shape). Times are emitted as UTC (`Z` suffix) so the
// receiver doesn't need a VTIMEZONE block.

import { site } from "@/lib/site";

export type IcsBooking = {
  courtId: number;
  startTime: Date;
  endTime: Date;
  bookingId: string;
};

/** YYYYMMDDTHHmmssZ — the format RFC 5545 requires for UTC instants. */
function toIcsDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return (
    `${d.getUTCFullYear()}` +
    `${pad(d.getUTCMonth() + 1)}` +
    `${pad(d.getUTCDate())}` +
    "T" +
    `${pad(d.getUTCHours())}` +
    `${pad(d.getUTCMinutes())}` +
    `${pad(d.getUTCSeconds())}` +
    "Z"
  );
}

/** ICS forbids unescaped `,` `;` `\` in TEXT values and folds lines at 75
 *  octets. We escape characters but skip the line-folding — modern parsers
 *  tolerate longer lines and our payload stays under 75 chars per field. */
function escape(text: string): string {
  return text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
}

export function generateICS(booking: IcsBooking): string {
  const uid = `breathe-booking-${booking.bookingId}@breathepickleball.in`;
  const dtstamp = toIcsDate(new Date());
  const dtstart = toIcsDate(booking.startTime);
  const dtend = toIcsDate(booking.endTime);
  const summary = escape(`Breathe Pickleball – Court ${booking.courtId}`);
  const location = escape(site.address);
  const description = escape(`Booking reference ${booking.bookingId}. Arrive 10 minutes early for check-in.`);

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Breathe Pickleball//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    `SUMMARY:${summary}`,
    `LOCATION:${location}`,
    `DESCRIPTION:${description}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Combine multiple bookings into one VCALENDAR (multi-VEVENT). Reuses the
 *  single-booking helper for the body and merges the wrappers. */
export function generateMultiICS(bookings: IcsBooking[]): string {
  if (bookings.length === 0) return generateICS({ courtId: 0, startTime: new Date(), endTime: new Date(), bookingId: "empty" });
  // Strip the first/last wrapper lines from each per-booking ICS and stitch
  // the VEVENT blocks together inside a single VCALENDAR.
  const blocks = bookings.map((b) => {
    const lines = generateICS(b).split("\r\n");
    const start = lines.indexOf("BEGIN:VEVENT");
    const end = lines.indexOf("END:VEVENT");
    return lines.slice(start, end + 1).join("\r\n");
  });
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Breathe Pickleball//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...blocks,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

/** Build the "Confirm on WhatsApp" deep link for a freshly created booking. */
export function whatsappConfirmLink(booking: {
  courtId: number;
  startTime: Date;
  bookingId: string;
}): string {
  const date = booking.startTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const time = booking.startTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const text = `Hi! Booked Court ${booking.courtId} on ${date} at ${time}. Ref: ${booking.bookingId}`;
  return `${site.whatsappHref}?text=${encodeURIComponent(text)}`;
}

/** Compose a single WhatsApp message that covers every confirmed slot — used
 *  when the player books multiple half-hour blocks in one go. */
export function whatsappBatchLink(bookings: IcsBooking[]): string {
  if (bookings.length === 0) return site.whatsappHref;
  if (bookings.length === 1) return whatsappConfirmLink(bookings[0]!);
  const lines = bookings.map((b) => {
    const date = b.startTime.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
    const time = b.startTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
    return `Court ${b.courtId} – ${date} at ${time}`;
  });
  const text = `Hi! Booked ${bookings.length} slots:\n${lines.join("\n")}`;
  return `${site.whatsappHref}?text=${encodeURIComponent(text)}`;
}
