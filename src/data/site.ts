// Business details, confirmed with the client in October 2026: one branch
// (Tripoli, open every day 12 pm – 12 am) and the shop's social pages.
export const site = {
  // The live address: link previews (WhatsApp, Instagram) need absolute URLs.
  url: "https://thesweetspotlb.com",
  /** The admin's own host (next.config.ts sends /admin there from the live site). */
  adminUrl: "https://admin.thesweetspotlb.com",
  instagramHandle: "thesweetspot_lb",
  instagramUrl: "https://www.instagram.com/thesweetspot_lb/",
  facebookUrl: "https://www.facebook.com/SweetSpot.lb",
  tiktokUrl: "https://www.tiktok.com/@thesweetspot_lb",
  tripoliDirectionsUrl:
    "https://www.google.com/maps/search/?api=1&query=The+Sweet+Spot+Tripoli+Lebanon",
  timeZone: "Asia/Beirut",
};

/**
 * Opening hours as [open, close] in minutes after midnight, indexed by weekday
 * (0 = Sunday). A close past 1440 runs into the next day.
 */
export const tripoliHours: [number, number][] = Array.from(
  { length: 7 },
  (): [number, number] => [12 * 60, 24 * 60], // every day 12 pm – 12 am
);
