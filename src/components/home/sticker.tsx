import Image from "next/image";

const dimensions = {
  cherry: [200, 200],
  smiley: [200, 200],
} as const;

type Props = {
  name: keyof typeof dimensions;
  className: string;
  float?: boolean;
};

/** Original brand artwork, with positioning and motion kept outside the SVG. */
export function HomeSticker({ name, className, float = false }: Props) {
  const [width, height] = dimensions[name];
  return (
    <span
      aria-hidden="true"
      data-home-sticker={name}
      data-sticker-float={float || undefined}
      className={`home-sticker pointer-events-none select-none ${className}`}
    >
      <Image
        src={`/stickers/${name}.svg`}
        alt=""
        width={width}
        height={height}
        loading="eager"
        className="block h-auto w-full"
      />
    </span>
  );
}
