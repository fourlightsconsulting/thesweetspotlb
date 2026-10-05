import { Fragment } from "react";

function Star() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[0.8em] flex-none fill-ticker-star">
      <path d="M12 2.6l2.8 6 6.6.7-4.9 4.5 1.4 6.5L12 17l-5.9 3.3 1.4-6.5-4.9-4.5 6.6-.7z" />
    </svg>
  );
}

/** Two identical halves scrolled by -50%, so the loop is seamless. */
function Half({ words }: { words: string[] }) {
  return (
    <div className="flex flex-none items-center gap-[0.85em] pe-[0.85em]">
      {[0, 1].map((round) =>
        words.map((word) => (
          <Fragment key={`${round}-${word}`}>
            <span className="whitespace-nowrap">{word}</span>
            <Star />
          </Fragment>
        )),
      )}
    </div>
  );
}

export function Ticker({ words }: { words: string[] }) {
  return (
    <div className="scallop-top relative z-2 border-b-[2.5px] border-chocolate bg-ticker py-[clamp(9px,0.9cqw,13px)] font-display text-[clamp(15px,1.45cqw,21px)] leading-[1.2] font-extrabold tracking-[0.05em] text-vanilla uppercase [--scallop-h:17px] [--scallop-r:12.5px] [--scallop-w:26px] [--scallop:var(--color-ticker)]">
      <p className="sr-only">{words.join(" · ")}</p>
      <div aria-hidden="true" className="overflow-hidden">
        <div className="marquee flex w-max">
          <Half words={words} />
          <Half words={words} />
        </div>
      </div>
    </div>
  );
}
