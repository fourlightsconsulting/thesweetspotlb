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
    <div className="scallop-top relative z-2 border-b-[3px] border-chocolate bg-ticker py-[clamp(14px,1.4cqw,20px)] font-ui text-[clamp(22px,2.4cqw,36px)] leading-[1.1] font-black text-vanilla uppercase [font-stretch:125%] [--scallop:var(--color-ticker)]">
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
