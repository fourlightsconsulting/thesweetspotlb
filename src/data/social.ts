// Stand-in content until the Instagram feed and curated Google reviews are
// connected. Every entry is marked as a placeholder on the page.
import type { StaticImageData } from "next/image";
import photoBoxLarge from "@/assets/images/photo-box-large.png";
import photoBox from "@/assets/images/photo-box.png";
import photoDrinks from "@/assets/images/photo-drinks.png";
import photoIcecream from "@/assets/images/photo-icecream.png";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import photoShop from "@/assets/images/photo-shop.png";
import photoWaffle from "@/assets/images/photo-waffle.png";

/**
 * Shaped like what the Instagram API returns, so the live feed can replace
 * this list: a thumbnail, the post link, and the video file for reels.
 */
export type InstagramPost = {
  id: string;
  image: StaticImageData;
  /** object-position for the crop */
  focus: string;
  isReel?: boolean;
  /** MP4 for reels; plays in the pop-up. */
  videoUrl?: string;
  permalink?: string;
};

export const instagramPosts: InstagramPost[] = [
  { id: "stand-in-1", image: photoIcecream, focus: "55% 50%", isReel: true },
  { id: "stand-in-2", image: photoWaffle, focus: "70% 30%" },
  { id: "stand-in-3", image: photoBoxLarge, focus: "45% 55%", isReel: true },
  { id: "stand-in-4", image: photoDrinks, focus: "62% 40%" },
  { id: "stand-in-5", image: photoProfiteroles, focus: "40% 60%", isReel: true },
  { id: "stand-in-6", image: photoShop, focus: "78% 50%" },
  { id: "stand-in-7", image: photoBox, focus: "30% 50%" },
];

export type Review = {
  quote: string;
  author: string;
  rating: number;
};

/** Sample copy for layout only. Replace with real Google reviews before launch. */
export const sampleReviews: Review[] = [
  {
    quote:
      "The Dubai crêpe is ridiculous. Crispy kunafa, pistachio everywhere. Already planning the next visit.",
    author: "Sample review 1",
    rating: 5,
  },
  {
    quote:
      "Ordered the Party Box for a birthday and it was gone in ten minutes. Packed beautifully, still warm.",
    author: "Sample review 2",
    rating: 5,
  },
  {
    quote: "Watching them roll the ice cream is half the fun. The Oreo rolls are the move.",
    author: "Sample review 3",
    rating: 5,
  },
  {
    quote: "Late-night waffle run, ready before we finished parking. Friendly team, spotless shop.",
    author: "Sample review 4",
    rating: 5,
  },
  {
    quote: "Profiteroles drowning in warm chocolate. That’s it, that’s the review.",
    author: "Sample review 5",
    rating: 5,
  },
];
