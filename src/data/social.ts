export type InstagramPost = {
  permalink: string;
  isReel?: boolean;
  media: {
    image: string;
    video?: string;
  };
};

export const instagramMediaPath = "/api/instagram-media/";

// Featured posts in their homepage display order.
export const instagramPosts: InstagramPost[] = [
  {
    permalink: "https://www.instagram.com/p/C3sDXnACoWP/",
    media: { image: `${instagramMediaPath}waffle-stick.webp` },
  },
  {
    permalink: "https://www.instagram.com/reel/De4QS-oiVy1/",
    isReel: true,
    media: {
      image: `${instagramMediaPath}cookie-crumble-cover.webp`,
      video: `${instagramMediaPath}cookie-crumble.mp4`,
    },
  },
  {
    permalink: "https://www.instagram.com/p/DCMyQQ6NCQu/",
    media: { image: `${instagramMediaPath}sushi-crepe.webp` },
  },
  {
    permalink: "https://www.instagram.com/p/DO6RM8bCRtl/",
    media: { image: `${instagramMediaPath}tri-box.webp` },
  },
  {
    permalink: "https://www.instagram.com/p/DYPPugjoTe4/",
    media: { image: `${instagramMediaPath}delight-cup.webp` },
  },
];

export type Review = {
  author: string;
  excerpt: string;
  permalink: string;
};

export const googleReviewsUrl =
  "https://www.google.com/maps/place/The+Sweet+Spot/@34.4261201,35.8290372,17z/data=!4m8!3m7!1s0x1521f7d959d7391b:0x1a240991edfece49!8m2!3d34.4261201!4d35.8290372!9m1!1b1!16s%2Fg%2F11ghx8mlkw";

// Check the Tripoli listing's newest reviews when refreshing this selection.
// Featured reviews have five stars and at least 75 characters of text.
export const featuredReviews: Review[] = [
  {
    author: "Nouha Moutraji",
    excerpt:
      "Sweet Spot is such a lovely place! The desserts are delicious, the presentation is beautiful, and the atmosphere is really nice. …",
    permalink: "https://maps.app.goo.gl/i5ZkgpW4n1CU8RVc6",
  },
  {
    author: "youssef fouad",
    excerpt:
      "amazing place i love the vibe the cookie cup 10/10 the service was the best i recommend",
    permalink: "https://maps.app.goo.gl/3E6kHsrzxF4sfYEH9",
  },
  {
    author: "Nour Majzoub",
    excerpt:
      "The crepe was so yummy! It was fresh, delicious, and honestly so satisfying. Definitely recommend! 🤍",
    permalink: "https://maps.app.goo.gl/Q3rEtFd3ZJMBeDMr8",
  },
  {
    author: "Roukaya Maassarani",
    excerpt:
      "Sweet spot has the best sweets in Lebanon! Its my go to spot when I need something sweet & delicious …",
    permalink: "https://maps.app.goo.gl/J3bojDvzXDWDFM5AA",
  },
  {
    author: "Sami Elkerdi",
    excerpt:
      "It was a wonderful experience, full of sophistication, good treatment and sweet taste ❤️.",
    permalink: "https://maps.app.goo.gl/uUBzW7pn9HExzeHF9",
  },
];
