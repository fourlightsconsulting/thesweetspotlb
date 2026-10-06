import { InstagramFeed } from "@/components/home/instagram-feed";
import { site } from "@/data/site";
import type { InstagramPost } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = { posts: InstagramPost[]; t: Dictionary["instagram"] };

/** Profile card with a row of posts; tapping one opens it in a pop-up. */
export function Instagram({ posts, t }: Props) {
  return (
    <section id="instagram" className="bg-strawberry-cream py-section">
      <div className="shell">
        <h2 className="title-section">{t.title}</h2>
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
