// Stand-in content until the Instagram feed and curated Google reviews are
// connected. Every entry is marked as a placeholder on the page.
import type { StaticImageData } from "next/image";
import photoBox from "@/assets/images/photo-box.png";
import photoDrinks from "@/assets/images/photo-drinks.png";
import photoIcecream from "@/assets/images/photo-icecream.png";
import photoProfiteroles from "@/assets/images/photo-profiteroles.png";
import photoWaffle from "@/assets/images/photo-waffle.png";

export type InstagramPost = {
  image: StaticImageData;
  /** object-position for the crop */
  focus: string;
  isReel?: boolean;
};

export const instagramPosts: InstagramPost[] = [
  { image: photoIcecream, focus: "55% 50%", isReel: true },
  { image: photoDrinks, focus: "62% 40%" },
  { image: photoBox, focus: "30% 50%" },
  { image: photoWaffle, focus: "70% 30%" },
  { image: photoProfiteroles, focus: "40% 60%" },
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
