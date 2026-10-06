// Business details. Handle, links and hours are drafts from the design handoff:
// confirm with the client before launch.
export const site = {
  // The live address: link previews (WhatsApp, Instagram) need absolute URLs.
  // Placeholder until the new domain is chosen.
  url: "http://localhost:3000",
  instagramHandle: "thesweetspot_lb",
  instagramUrl: "https://www.instagram.com/thesweetspot_lb/",
  tripoliDirectionsUrl:
    "https://www.google.com/maps/search/?api=1&query=The+Sweet+Spot+Tripoli+Lebanon",
  totersUrl: "https://www.totersapp.com/",
  timeZone: "Asia/Beirut",
};

/**
 * Opening hours as [open, close] in minutes after midnight, indexed by weekday
 * (0 = Sunday). A close past 1440 runs into the next day.
 */
export const tripoliHours: [number, number][] = [
  [12 * 60, 25 * 60], // Sun 12 pm – 1 am
  [12 * 60, 24 * 60], // Mon 12 pm – 12 am
  [12 * 60, 24 * 60], // Tue
  [12 * 60, 24 * 60], // Wed
  [12 * 60, 24 * 60], // Thu
  [12 * 60, 25 * 60], // Fri 12 pm – 1 am
  [12 * 60, 25 * 60], // Sat
];

/**
 * Hero video, served from /public. Each screen size is optional: without a
 * clip, that size keeps the photo stills. Aim for short, silent H.264 MP4s:
 * ~2 MB 16:9 for desktop, ~1–2 MB portrait for phones (shown as a 4:5 crop,
 * trimmed equally top and bottom).
 *
 * The phone poster (src/assets/images/hero-mobile-poster.jpg) is the frame at
 * `startAt` seconds, so playback picks up exactly where the still leaves off.
 */
export type HeroVideo = { mobile?: string; desktop?: string; startAt?: number };

export const heroVideo: HeroVideo | null = {
  mobile: "/video/hero-mobile.mp4",
  startAt: 4,
};
