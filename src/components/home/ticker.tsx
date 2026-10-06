import { Fragment } from "react";
import { MenuIcon, menuIconNames } from "@/components/icons";

/**
 * Two identical halves scrolled by -50%, so the loop is seamless. The menu
 * icons take turns between the phrases.
 */
function Half({ words }: { words: string[] }) {
  return (
    <div className="flex flex-none items-center gap-[0.85em] pe-[0.85em]">
      {[0, 1].map((round) =>
        words.map((word, i) => (
          <Fragment key={`${round}-${word}`}>
            <span className="whitespace-nowrap">{word}</span>
            <MenuIcon
              name={menuIconNames[(round * words.length + i) % menuIconNames.length]}
              className="size-[1.25em] stroke-ticker-icon [--icon-stroke:2.2px]"
            />
          </Fragment>
        )),
      )}
    </div>
  );
}

export function Ticker({ words }: { words: string[] }) {
  return (
    <div className="scallop-top relative z-2 border-b-[2.5px] border-chocolate bg-ticker py-[clamp(9px,0.9cqw,13px)] font-display text-[clamp(19px,1.45cqw,21px)] leading-[1.2] font-extrabold tracking-[0.05em] text-ticker-ink uppercase [--scallop-h:17px] [--scallop-r:12.5px] [--scallop-w:26px] [--scallop:var(--color-ticker)]">
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
