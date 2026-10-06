import Image from "next/image";
import { MenuIcon } from "@/components/icons";
import type { MenuItem } from "@/data/menu";

type Props = { item: MenuItem; sizes: string; className?: string; eager?: boolean };

/** The item's photo, or a Cotton Candy tile with its category icon until there is one. */
export function ItemImage({ item, sizes, className = "", eager = false }: Props) {
  if (item.image) {
    return (
      <Image
        src={item.image}
        alt=""
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        className={`bg-cotton-candy object-cover ${className}`}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={`flex items-center justify-center bg-cotton-candy ${className}`}
    >
      <MenuIcon
        name={item.category}
        className="size-[38%] stroke-blueberry [--icon-stroke:2.2px]"
      />
    </span>
  );
}
