import { InstagramFeed } from "@/components/home/instagram-feed";
import { site } from "@/data/site";
import type { InstagramPost } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = { posts: InstagramPost[]; t: Dictionary["instagram"] };

/** Profile card for the selected Instagram posts. */
export function Instagram({ posts, t }: Props) {
  return (
    <section
      id="instagram"
      className="wave-top bg-cotton-candy py-section [--wave:var(--color-cotton-candy)]"
    >
      <div className="relative shell">
        <h2 className="title-section">{t.title}</h2>
        <InstagramFeed
          posts={posts}
          t={t}
          handle={site.instagramHandle}
          profileUrl={site.instagramUrl}
        />
      </div>
    </section>
  );
}
