// Central business information for Breathe Pickleball, Kaikhali (North Kolkata).
// Sourced from the club's public listings. Update here to change site-wide details.

/**
 * Canonical public site URL. Defaults to the business domain so SEO metadata,
 * sitemap, robots, and structured data all reference breathepickleball.in
 * (not the Vercel preview URL). Override per-environment with
 * NEXT_PUBLIC_SITE_URL if needed.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "https://www.breathepickleball.in"
).replace(/\/$/, "");

export const site = {
  name: "Breathe Pickleball",
  url: SITE_URL,
  tagline: "North Kolkata's home of pickleball",
  area: "Kaikhali, Kolkata",
  phoneDisplay: "+91 74390 10356",
  phoneHref: "tel:+917439010356",
  whatsappHref: "https://wa.me/917439010356",
  email: "play@breathepickleball.in",
  emailHref: "mailto:play@breathepickleball.in",
  address:
    "Panchawati Complex, Plot No. 2, near Shyam Baba Mandir, Mali Bagan, Biman Nagar, Kaikhali, Kolkata 700052",
  /** Short address for the moving header / ticker — no pincode or sub-locality. */
  headerAddress: "Panchwati Complex, Kaikhali",
  hoursShort: "Open daily · 5 AM – 11 PM",
  courts: 3,
  instagram: "https://www.instagram.com/breathepickleball/",
  facebook: "https://www.facebook.com/people/Breathe-Pickleball/61568186487606/",
  whatsappCommunity:
    "https://chat.whatsapp.com/Bguz5VIdwIC4cijAxrXYYh?s=cl&p=a&mlu=1&amv=2",
  mapsEmbed:
    "https://www.google.com/maps?q=Breathe+Pickleball+Kaikhali+Kolkata&output=embed",
  mapsLink: "https://www.google.com/maps/search/?api=1&query=Breathe+Pickleball+Kaikhali+Kolkata",
} as const;

export const navLinks = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/calendar", label: "Calendar" },
  { href: "/tournaments", label: "Tournaments" },
  { href: "/gallery", label: "Gallery" },
  { href: "/contact", label: "Contact" },
] as const;
