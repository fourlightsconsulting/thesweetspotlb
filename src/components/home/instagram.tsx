import Image from "next/image";
import { ArrowLoop } from "@/components/doodles";
import { Reveal } from "@/components/reveal";
import { site } from "@/data/site";
import type { InstagramPost } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = { posts: InstagramPost[]; t: Dictionary["instagram"] };

/**
 * Grid: the latest Reel as one big tile, four posts beside it. Static on
 * purpose; the ticker and reviews already move.
 */
export function Instagram({ posts, t }: Props) {
  return (
    <section id="instagram" className="pt-[clamp(100px,10cqw,160px)]">
      <Reveal className="shell">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2.5">
          <h2 className="font-display text-[clamp(36px,4cqw,60px)] leading-none font-black tracking-[-0.03em]">
            {t.title}
          </h2>
          <div className="relative">
            <a
              href={site.instagramUrl}
              target="_blank"
              rel="noreferrer"
              className="text-link min-h-11 text-base"
            >
              {t.follow}
            </a>
            <ArrowLoop className="absolute end-[18%] top-[78%] hidden h-[60px] w-[52px] stroke-blueberry desk:block rtl:-scale-x-100" />
          </div>
        </div>

        <div className="mt-[clamp(24px,3cqw,44px)] grid grid-cols-2 gap-2 desk:grid-cols-4 desk:gap-[clamp(8px,0.9cqw,14px)]">
          {posts.map((post, i) => (
            <a
              key={post.image.src}
              href={site.instagramUrl}
              target="_blank"
              rel="noreferrer"
              aria-label={post.isReel ? t.reel : `${t.post} ${i}`}
              className={`group relative block overflow-hidden rounded-[4px] bg-strawberry-milk ${
                post.isReel ? "col-span-2 row-span-2 aspect-square" : "aspect-square"
              }`}
            >
              <Image
                src={post.image}
                alt=""
                fill
                sizes={
                  post.isReel ? "(min-width: 820px) 50vw, 100vw" : "(min-width: 820px) 25vw, 50vw"
                }
                className={`object-cover transition-transform duration-500 ease-soft group-hover:scale-105 ${post.isReel ? "slow-zoom" : ""}`}
                style={{ objectPosition: post.focus }}
              />
              {post.isReel ? (
                <>
                  <span className="absolute inset-0 bg-[linear-gradient(0deg,rgb(36_91_120/.55),transparent_45%)]" />
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex size-[clamp(64px,6cqw,88px)] items-center justify-center rounded-full border-[2.5px] border-chocolate bg-vanilla shadow-[4px_5px_0_var(--color-chocolate)] transition-transform duration-300 ease-soft group-hover:scale-110">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="ms-1 size-[40%] fill-blueberry"
                      >
                        <path d="M7 4.5v15l12.5-7.5z" />
                      </svg>
                    </span>
                  </span>
                  <span className="absolute start-4 bottom-4 inline-flex items-center gap-2 font-ui text-sm font-bold text-vanilla desk:start-5 desk:bottom-5">
                    <ReelIcon />
                    {t.reel}
                  </span>
                </>
              ) : (
                <span className="absolute inset-0 flex items-center justify-center bg-blueberry/0 text-vanilla opacity-0 transition-[opacity,background-color] duration-300 group-hover:bg-blueberry/35 group-hover:opacity-100">
                  <InstagramIcon />
                </span>
              )}
            </a>
          ))}
        </div>
        <p className="mt-3 [text-align:left] font-mono text-[11px] leading-normal text-cacao [direction:ltr]">
          Stand-in posts · live feed to connect
        </p>
      </Reveal>
    </section>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-8 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}

function ReelIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round]"
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M3 8.5h18M8.5 3l3 5.5M14.5 3l3 5.5" />
      <path d="M10.5 12v5l4-2.5z" />
    </svg>
  );
}
