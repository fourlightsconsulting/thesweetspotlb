"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import logo from "@/assets/images/logo-sky.svg";
import type { InstagramPost } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = {
  posts: InstagramPost[];
  t: Dictionary["instagram"];
  handle: string;
  profileUrl: string;
};

export function InstagramFeed({ posts, t, handle, profileUrl }: Props) {
  return (
    <div className="mt-[clamp(24px,3cqw,40px)] rounded-[28px] bg-whipped p-5 shadow-[0_1px_2px_rgba(26,86,167,.08),0_24px_48px_-28px_rgba(26,86,167,.45)] desk:p-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-4 sm:gap-x-5">
        <Avatar className="size-16 sm:size-[76px] desk:size-24" />
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[15px] leading-6 font-bold sm:text-[17px]">
            <bdi dir="ltr">@{handle}</bdi>
          </p>
          <p className="mt-1 font-ui text-sm leading-[1.5] text-ink-soft">
            {t.bio.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
        </div>
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="btn btn-primary btn-sm w-full sm:w-auto"
        >
          <InstagramIcon className="size-[18px]" />
          {t.followShort}
        </a>
      </div>

      <MediaGallery posts={posts} t={t} />
    </div>
  );
}

function MediaGallery({ posts, t }: Pick<Props, "posts" | "t">) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selected, setSelected] = useState<{ post: InstagramPost; label: string } | null>(null);

  return (
    <>
      <ul className="-mx-5 mt-5 grid snap-x snap-mandatory scroll-px-3 auto-cols-[calc((100%_-_1rem)/3)] grid-flow-col gap-2 overflow-x-auto overscroll-x-contain px-3 py-1 desk:mx-0 desk:grid-flow-row desk:grid-cols-5 desk:gap-3 desk:overflow-visible desk:px-0">
        {posts.map((post, index) => {
          const label = `${post.isReel ? t.reel : t.post} ${index + 1}`;
          return (
            <li key={post.permalink} className="min-w-0 snap-start">
              <button
                type="button"
                aria-haspopup="dialog"
                aria-label={label}
                onClick={() => {
                  setSelected({ post, label });
                  dialogRef.current?.showModal();
                }}
                className="relative block aspect-[3/4] w-full overflow-hidden rounded-xl bg-strawberry-milk focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-raspberry"
              >
                <Image src={post.media.image} alt="" fill unoptimized className="object-cover" />
                {post.media.video && (
                  <span className="absolute start-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-ink/65 text-paper">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      className="ms-0.5 size-4 fill-current"
                    >
                      <path d="M7 4.5v15l12.5-7.5z" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={selected?.label ?? t.title}
        onClose={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
        className="m-auto max-h-[calc(100dvh_-_1.5rem)] w-[min(92vw,420px)] overflow-hidden rounded-2xl border-0 bg-ink p-0 text-paper backdrop:bg-ink/75"
      >
        <div
          className={`relative max-h-[calc(100dvh_-_1.5rem)] w-full ${selected?.post.media.video ? "aspect-[9/16]" : "aspect-[4/5]"}`}
        >
          <button
            type="button"
            aria-label={t.close}
            onClick={() => dialogRef.current?.close()}
            className="btn btn-secondary btn-sm absolute end-3 top-3 z-10 size-11 rounded-full p-0"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              className="size-5 fill-none stroke-current stroke-2 [stroke-linecap:round]"
            >
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
          {selected && (
            <>
              {selected.post.media.video ? (
                <video
                  aria-label={selected.label}
                  src={selected.post.media.video}
                  poster={selected.post.media.image}
                  autoPlay
                  muted
                  controls
                  playsInline
                  className="size-full object-contain"
                />
              ) : (
                <Image
                  src={selected.post.media.image}
                  alt={selected.label}
                  fill
                  unoptimized
                  className="object-contain"
                />
              )}
              <a
                href={selected.post.permalink}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary btn-sm absolute start-3 top-3 z-10 rounded-full px-3 text-[13px]"
              >
                <InstagramIcon className="size-[18px]" />
                {t.viewOnInstagram}
              </a>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}

/** The logo inside an Instagram-style story ring, in brand colours. */
function Avatar({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full bg-[conic-gradient(from_200deg,var(--color-raspberry),var(--color-raspberry),var(--color-strawberry-cream),var(--color-raspberry))] p-[3px] ${className}`}
    >
      <span className="flex size-full items-center justify-center rounded-full border-2 border-whipped bg-strawberry-cream">
        <Image src={logo} alt="" sizes="96px" className="h-auto w-[74%]" />
      </span>
    </span>
  );
}

function InstagramIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`fill-none stroke-current stroke-2 [stroke-linecap:round] [stroke-linejoin:round] ${className}`}
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <path d="M17.5 6.5h.01" />
    </svg>
  );
}
