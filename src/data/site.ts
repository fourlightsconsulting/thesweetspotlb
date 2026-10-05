// Business details. Handle, links and hours are drafts from the design handoff:
// confirm with the client before launch.
export const site = {
  instagramHandle: "thesweetspotlb",
  instagramUrl: "https://www.instagram.com/thesweetspotlb/",
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
 * Hero video, served from /public (e.g. "/video/hero-desktop.mp4"). Leave null
 * until the clips arrive; the hero shows stills meanwhile. Aim for 6–10 s,
 * silent H.264 MP4: ~2 MB 16:9 for desktop, under 1 MB 4:5 (e.g. 1080×1350) for
 * phones. A 9:16 Reel also works on phones; it is centre-cropped to 4:5.
 */
export const heroVideo: { desktop: string; mobile: string } | null = null;
