import type { Locale } from "@/i18n/config";

// The brand stickers (Brand presentation, Stickers), redrawn as SVG. Decorative
// (aria-hidden), sized with className. They tuck into the corners of photos and
// bands, never over words. The two with words speak the page's language.

type Props = { className?: string };
type WordProps = Props & { lang: Locale };

export function CherrySticker({ className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={className}>
      <path
        className="fill-strawberry-cream stroke-blueberry"
        strokeWidth="1.8"
        strokeLinejoin="miter"
        d="M100 9.8L114 34.3L139 12.3L139.5 45.6L167.6 39.1L158.2 66.4L180.5 73.9L166.8 93L188.2 109.3L163.9 120.8L182.9 147.8L149.9 145L154.4 174.8L127.3 161.4L117.7 183.2L100 167.2L81.8 185.4L72.7 161.4L44.2 176.8L50.1 145L18.7 146.9L36.1 120.8L14.5 109L33.2 93L18.1 73.4L41.8 66.4L30.2 37.2L60.5 45.6L61.4 13.3L86 34.3Z"
      />
      <path
        className="stroke-blueberry"
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        d="M80 114C80 92 88 72 100 56M122 104C116 86 108 70 100 56"
      />
      <circle className="fill-raspberry" cx="80" cy="130" r="19" />
      <circle className="fill-raspberry" cx="123" cy="120" r="19" />
      <ellipse
        className="fill-strawberry-cream"
        cx="73"
        cy="123"
        rx="4"
        ry="6.5"
        transform="rotate(30 73 123)"
        opacity=".6"
      />
      <ellipse
        className="fill-strawberry-cream"
        cx="116"
        cy="113"
        rx="4"
        ry="6.5"
        transform="rotate(30 116 113)"
        opacity=".6"
      />
    </svg>
  );
}

export function SmileySticker({ className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={className}>
      <circle
        className="fill-cotton-candy stroke-strawberry-cream"
        cx="100"
        cy="100"
        r="84"
        strokeWidth="18"
      />
      <path
        className="fill-strawberry-cream"
        transform="translate(74 86) scale(0.36)"
        d="M0 30C-40 2-31-30-14-30-5-30 0-22 0-15 0-22 5-30 14-30 31-30 40 2 0 30Z"
      />
      <path
        className="fill-strawberry-cream"
        transform="translate(126 86) scale(0.36)"
        d="M0 30C-40 2-31-30-14-30-5-30 0-22 0-15 0-22 5-30 14-30 31-30 40 2 0 30Z"
      />
      <path
        className="stroke-strawberry-cream"
        fill="none"
        strokeWidth="10"
        strokeLinecap="round"
        d="M58 116Q100 160 142 116"
      />
    </svg>
  );
}

/**
 * The strawberry on a scalloped badge, with a hard blue shadow like the
 * buttons. The badge is pink; on a pink band set --badge to another colour.
 */
export function StrawberrySticker({ className = "" }: Props) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={className}>
      <path
        className="fill-(--badge,var(--color-strawberry-cream))"
        d="M100 6C102 6 104.1 6.8 106 8C107.9 9.1 109.8 11.2 111.5 12.9C113.2 14.5 114.7 16.7 116.3 18C117.9 19.4 119.4 20.5 121.2 21C122.9 21.5 124.8 21.2 126.9 20.9C128.9 20.5 131.3 19.4 133.6 18.8C135.9 18.2 138.6 17.3 140.8 17.3C143 17.3 145.3 17.6 147 18.6C148.7 19.6 150.2 21.4 151.2 23.3C152.3 25.3 152.9 28 153.5 30.3C154.2 32.6 154.4 35.2 155.1 37.2C155.8 39.1 156.5 40.9 157.8 42.2C159.1 43.5 160.8 44.2 162.8 44.9C164.8 45.6 167.4 45.9 169.7 46.5C172 47.1 174.7 47.7 176.7 48.8C178.6 49.9 180.4 51.3 181.4 53C182.4 54.7 182.7 57 182.7 59.2C182.7 61.4 181.8 64 181.2 66.4C180.6 68.7 179.5 71.1 179.1 73.1C178.8 75.2 178.5 77.1 179 78.8C179.5 80.6 180.6 82.1 182 83.7C183.3 85.3 185.5 86.8 187.1 88.5C188.8 90.2 190.9 92.1 192 94C193.2 95.9 194 98 194 100C194 102 193.2 104.1 192 106C190.9 107.9 188.8 109.8 187.1 111.5C185.5 113.2 183.3 114.7 182 116.3C180.6 117.9 179.5 119.4 179 121.2C178.5 122.9 178.8 124.8 179.1 126.9C179.5 128.9 180.6 131.3 181.2 133.6C181.8 135.9 182.7 138.6 182.7 140.8C182.7 143 182.4 145.3 181.4 147C180.4 148.7 178.6 150.2 176.7 151.2C174.7 152.3 172 152.9 169.7 153.5C167.4 154.2 164.8 154.4 162.8 155.1C160.8 155.8 159.1 156.5 157.8 157.8C156.5 159.1 155.8 160.8 155.1 162.8C154.4 164.8 154.2 167.4 153.5 169.7C152.9 172 152.3 174.7 151.2 176.7C150.2 178.6 148.7 180.4 147 181.4C145.3 182.4 143 182.7 140.8 182.7C138.6 182.7 135.9 181.8 133.6 181.2C131.3 180.6 128.9 179.5 126.9 179.1C124.8 178.8 122.9 178.5 121.2 179C119.4 179.5 117.9 180.6 116.3 182C114.7 183.3 113.2 185.5 111.5 187.1C109.8 188.8 107.9 190.9 106 192C104.1 193.2 102 194 100 194C98 194 95.9 193.2 94 192C92.1 190.9 90.2 188.8 88.5 187.1C86.8 185.5 85.3 183.3 83.7 182C82.1 180.6 80.6 179.5 78.8 179C77.1 178.5 75.2 178.8 73.1 179.1C71.1 179.5 68.7 180.6 66.4 181.2C64 181.8 61.4 182.7 59.2 182.7C57 182.7 54.7 182.4 53 181.4C51.3 180.4 49.9 178.6 48.8 176.7C47.7 174.7 47.1 172 46.5 169.7C45.9 167.4 45.6 164.8 44.9 162.8C44.2 160.8 43.5 159.1 42.2 157.8C40.9 156.5 39.1 155.8 37.2 155.1C35.2 154.4 32.6 154.2 30.3 153.5C28 152.9 25.3 152.3 23.3 151.2C21.4 150.2 19.6 148.7 18.6 147C17.6 145.3 17.3 143 17.3 140.8C17.3 138.6 18.2 135.9 18.8 133.6C19.4 131.3 20.5 128.9 20.9 126.9C21.2 124.8 21.5 122.9 21 121.2C20.5 119.4 19.4 117.9 18 116.3C16.7 114.7 14.5 113.2 12.9 111.5C11.2 109.8 9.1 107.9 8 106C6.8 104.1 6 102 6 100C6 98 6.8 95.9 8 94C9.1 92.1 11.2 90.2 12.9 88.5C14.5 86.8 16.7 85.3 18 83.7C19.4 82.1 20.5 80.6 21 78.8C21.5 77.1 21.2 75.2 20.9 73.1C20.5 71.1 19.4 68.7 18.8 66.4C18.2 64 17.3 61.4 17.3 59.2C17.3 57 17.6 54.7 18.6 53C19.6 51.3 21.4 49.9 23.3 48.8C25.3 47.7 28 47.1 30.3 46.5C32.6 45.9 35.2 45.6 37.2 44.9C39.1 44.2 40.9 43.5 42.2 42.2C43.5 40.9 44.2 39.1 44.9 37.2C45.6 35.2 45.9 32.6 46.5 30.3C47.1 28 47.7 25.3 48.8 23.3C49.9 21.4 51.3 19.6 53 18.6C54.7 17.6 57 17.3 59.2 17.3C61.4 17.3 64 18.2 66.4 18.8C68.7 19.4 71.1 20.5 73.1 20.9C75.2 21.2 77.1 21.5 78.8 21C80.6 20.5 82.1 19.4 83.7 18C85.3 16.7 86.8 14.5 88.5 12.9C90.2 11.2 92.1 9.1 94 8C95.9 6.8 98 6 100 6Z"
      />
      <g transform="rotate(-24 100 112)">
        <path
          className="fill-blueberry"
          transform="translate(5 6)"
          d="M60 86C60 68 80 64 100 64C120 64 140 68 140 86C140 114 118 148 100 162C82 148 60 114 60 86Z"
        />
        <path
          className="fill-strawberry-cream stroke-blueberry"
          strokeWidth="2.6"
          strokeLinejoin="round"
          d="M60 86C60 68 80 64 100 64C120 64 140 68 140 86C140 114 118 148 100 162C82 148 60 114 60 86Z"
        />
        <ellipse className="fill-raspberry" cx="84" cy="88" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="100" cy="88" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="116" cy="88" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="76" cy="102" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="92" cy="102" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="108" cy="102" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="124" cy="102" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="84" cy="116" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="100" cy="116" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="116" cy="116" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="92" cy="130" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="108" cy="130" rx="2.6" ry="3.8" />
        <ellipse className="fill-raspberry" cx="100" cy="144" rx="2.6" ry="3.8" />
        <path
          className="stroke-blueberry"
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          d="M100 66Q101 54 108 46"
        />
        <path
          className="fill-cotton-candy stroke-blueberry"
          strokeWidth="2.6"
          strokeLinejoin="round"
          d="M66 76Q74 54 88 66Q92 48 100 62Q108 48 112 66Q126 54 134 76Q117 69 100 73Q83 69 66 76Z"
        />
      </g>
    </svg>
  );
}

const takeAway = { en: ["TAKE", "AWAY"], ar: ["سفري"] };

export function TakeAwaySticker({ lang, className = "" }: WordProps) {
  const words = takeAway[lang];
  return (
    <svg aria-hidden="true" viewBox="0 0 240 160" className={className}>
      <g transform="rotate(-7 120 80)">
        <path
          className="fill-raspberry"
          d="M32 19H208A16 16 0 0 0 224 35Q234 80 224 125A16 16 0 0 0 208 141H32A16 16 0 0 0 16 125Q6 80 16 35A16 16 0 0 0 32 19Z"
        />
        <path
          className="stroke-strawberry-cream"
          fill="none"
          strokeWidth="2.4"
          d="M38 28H202A12 12 0 0 0 214 40Q222 80 214 120A12 12 0 0 0 202 132H38A12 12 0 0 0 26 120Q18 80 26 40A12 12 0 0 0 38 28Z"
        />
        {words.map((word, i) => (
          <text
            key={word}
            x="120"
            y={words.length === 1 ? 96 : 76 + i * 35}
            className="fill-strawberry-cream font-ui"
            fontSize={words.length === 1 ? 46 : 34}
            fontWeight="800"
            textAnchor="middle"
          >
            {word}
          </text>
        ))}
        <circle className="fill-strawberry-cream" cx="42" cy="80" r="4" />
        <circle className="fill-strawberry-cream" cx="198" cy="80" r="4" />
      </g>
    </svg>
  );
}

const yumWord = { en: "YUM", ar: "زاكي" };

export function YumSticker({ lang, className = "" }: WordProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 124" className={className}>
      <ellipse
        className="fill-cotton-candy stroke-blueberry"
        cx="110"
        cy="62"
        rx="106"
        ry="58"
        strokeWidth="2"
      />
      <ellipse
        className="stroke-strawberry-cream"
        cx="110"
        cy="62"
        rx="93"
        ry="45"
        fill="none"
        strokeWidth="2.6"
      />
      <circle className="fill-strawberry-cream" cx="45" cy="62" r="4" />
      <circle className="fill-strawberry-cream" cx="175" cy="62" r="4" />
      <text
        x="110"
        y="77"
        className="fill-strawberry-cream font-ui"
        fontSize="42"
        fontWeight="800"
        textAnchor="middle"
        transform={lang === "ar" ? undefined : "skewX(-10) translate(11 0)"}
      >
        {yumWord[lang]}
      </text>
    </svg>
  );
}
