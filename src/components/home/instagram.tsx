import { InstagramFeed } from "@/components/home/instagram-feed";
import { site } from "@/data/site";
import type { InstagramPost } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = { posts: InstagramPost[]; t: Dictionary["instagram"] };

/** Profile card with a row of posts; tapping one opens it in a pop-up. */
export function Instagram({ posts, t }: Props) {
  return (
    <section id="instagram" className="pt-[clamp(100px,10cqw,160px)]">
      <div className="shell">
        <h2 className="font-display text-[clamp(36px,4cqw,60px)] leading-none font-black tracking-[-0.03em]">
          {t.title}
        </h2>
        <p className="mt-3 max-w-[44ch] font-body text-[clamp(16px,1.3cqw,19px)] leading-normal text-pretty text-cacao">
          {t.subtitle}
        </p>
        <InstagramFeed
          posts={posts}
          t={t}
          handle={site.instagramHandle}
          profileUrl={site.instagramUrl}
        />
        <p className="mt-3 [text-align:left] font-mono text-[11px] leading-normal text-cacao [direction:ltr]">
          Stand-in posts · live feed to connect
        </p>
      </div>
    </section>
  );
}
