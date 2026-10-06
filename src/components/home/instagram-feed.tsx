"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import logo from "@/assets/images/logo-blueberry.png";
import type { InstagramPost } from "@/data/social";
import type { Dictionary } from "@/i18n/dictionaries/en";

type Props = {
  posts: InstagramPost[];
  t: Dictionary["instagram"];
  handle: string;
  profileUrl: string;
};

export function InstagramFeed({ posts, t, handle, profileUrl }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const post = openIndex === null ? null : posts[openIndex];

  const open = (index: number) => {
    setOpenIndex(index);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();

  return (
    <div className="mt-[clamp(24px,3cqw,40px)] rounded-[28px] bg-whipped p-5 shadow-[0_1px_2px_rgba(53,37,34,.08),0_24px_48px_-28px_rgba(53,37,34,.45)] desk:p-8">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-4">
        <Avatar className="size-[76px] desk:size-24" />
        <div className="min-w-0 flex-1">
          <p className="font-ui text-[17px] leading-6 font-bold">
            <bdi dir="ltr">@{handle}</bdi>
          </p>
          <p className="mt-1 font-ui text-sm leading-[1.5] text-cacao">
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

      <div className="-mx-5 mt-5 grid snap-x snap-mandatory scroll-px-5 [scrollbar-width:none] auto-cols-[42%] grid-flow-col gap-2.5 overflow-x-auto px-5 pb-1 sm:auto-cols-[28%] desk:-mx-8 desk:scroll-px-8 desk:auto-cols-[calc((100%-5*12px)/6)] desk:gap-3 desk:px-8">
        {posts.map((item, i) => (
          <button
            key={item.id}
            type="button"
            onClick={() => open(i)}
            aria-haspopup="dialog"
            aria-label={`${item.isReel ? t.reel : t.post} ${i + 1}`}
            className="group relative aspect-[3/4] snap-start overflow-hidden rounded-xl bg-strawberry-milk focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-caramel"
          >
            <Image
              src={item.image}
              alt=""
              fill
              sizes="(min-width: 820px) 16vw, (min-width: 640px) 28vw, 42vw"
              className="object-cover transition-transform duration-500 ease-soft group-hover:scale-105"
              style={{ objectPosition: item.focus }}
            />
            {item.isReel && (
              <span className="absolute start-2 bottom-2 flex size-7 items-center justify-center rounded-full bg-chocolate/45 text-vanilla">
                <PlayIcon className="ms-0.5 size-3.5" />
              </span>
            )}
          </button>
        ))}
      </div>

      <dialog
        ref={dialogRef}
        aria-label={post ? (post.isReel ? t.reel : t.post) : undefined}
        onClose={() => setOpenIndex(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) close(); // click on the backdrop
        }}
        className="m-auto w-[min(92vw,420px)] overflow-visible border-0 bg-transparent p-0 backdrop:bg-chocolate/75 backdrop:backdrop-blur-sm"
      >
        {post && (
          <div className="overflow-hidden rounded-2xl bg-chocolate text-vanilla">
            <div
              className={`relative max-h-[calc(100svh-150px)] w-full ${post.isReel ? "aspect-[9/16]" : "aspect-[4/5]"}`}
            >
              {post.videoUrl ? (
                <video
                  src={post.videoUrl}
                  autoPlay
                  controls
                  playsInline
                  className="size-full bg-chocolate object-cover"
                />
              ) : (
                <Image
                  src={post.image}
                  alt=""
                  fill
                  sizes="420px"
                  className="object-cover"
                  style={{ objectPosition: post.focus }}
                />
              )}
              <button
                type="button"
                onClick={close}
                aria-label={t.close}
                className="btn btn-secondary btn-sm absolute end-3 top-3 size-11 rounded-full p-0"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="size-5 fill-none stroke-current stroke-[2.4] [stroke-linecap:round]"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <Avatar className="size-9" />
              <span className="flex-1 font-ui text-sm font-bold">
                <bdi dir="ltr">@{handle}</bdi>
              </span>
              <a
                href={post.permalink ?? profileUrl}
                target="_blank"
                rel="noreferrer"
                className="font-ui text-sm font-bold whitespace-nowrap text-strawberry-cream underline decoration-caramel decoration-2 underline-offset-4"
              >
                {t.viewOnInstagram}
              </a>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

/** The logo inside an Instagram-style story ring, in brand colours. */
function Avatar({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 rounded-full bg-[conic-gradient(from_200deg,var(--color-raspberry),var(--color-toffee),var(--color-strawberry-cream),var(--color-raspberry))] p-[3px] ${className}`}
    >
      <span className="flex size-full items-center justify-center rounded-full border-2 border-whipped bg-vanilla">
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

function PlayIcon({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className={`fill-current ${className}`}>
      <path d="M7 4.5v15l12.5-7.5z" />
    </svg>
  );
}
