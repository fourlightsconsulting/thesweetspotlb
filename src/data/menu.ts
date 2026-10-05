// Draft menu from the design handoff (tss-data.js). This moves to Supabase
// once the admin side exists; keep the shapes close to what the tables will be.
import type { StaticImageData } from "next/image";
import type { Locale } from "@/i18n/config";
import boxOpen from "@/assets/images/menu-box-open.png";
import icecreamCup from "@/assets/images/menu-icecream-cup.png";
import icedTrio from "@/assets/images/menu-iced-trio.png";
import nutellaCrepe from "@/assets/images/menu-nutella-crepe.png";
import pancakes from "@/assets/images/menu-pancakes.png";
import profiterolesPlate from "@/assets/images/menu-profiteroles-plate.png";
import waffleCream from "@/assets/images/menu-waffle-cream.png";

export type Localized = Record<Locale, string>;

export type CategoryId = "crepes" | "waffles" | "pancakes" | "rolls" | "bakes" | "boxes" | "drinks";

export type Category = {
  id: CategoryId;
  name: Localized;
  description: Localized;
  image: StaticImageData;
};

export type MenuItem = {
  id: string;
  category: CategoryId;
  price: number;
  tag?: "fav" | "new" | "limited";
  name: Localized;
  description: Localized;
};

export const categories: Category[] = [
  {
    id: "crepes",
    name: { en: "Crêpes", ar: "كريب" },
    description: {
      en: "Thin, warm, folded around Nutella.",
      ar: "رقيقة وسخنة، ملفوفة على النوتيلا.",
    },
    image: nutellaCrepe,
  },
  {
    id: "waffles",
    name: { en: "Waffles", ar: "وافل" },
    description: { en: "Crispy outside. Soft inside.", ar: "مقرمش من برّا، طري من جوّا." },
    image: waffleCream,
  },
  {
    id: "pancakes",
    name: { en: "Pancakes", ar: "بان كيك" },
    description: {
      en: "Fluffy stacks, drizzled to order.",
      ar: "طبقات منفوشة مع الصوص اللي بتحبه.",
    },
    image: pancakes,
  },
  {
    id: "rolls",
    name: { en: "Ice cream", ar: "آيس كريم" },
    description: { en: "Rolled fresh in front of you.", ar: "بينلفّ طازة قدّامك." },
    image: icecreamCup,
  },
  {
    id: "bakes",
    name: { en: "Profiteroles & brookies", ar: "بروفيترول وبروكي" },
    description: { en: "Bite-size and covered in chocolate.", ar: "لقمة صغيرة مغطّاة بالشوكولا." },
    image: profiterolesPlate,
  },
  {
    id: "boxes",
    name: { en: "Dessert boxes", ar: "علب الحلو" },
    description: { en: "Made for sharing. Or not.", ar: "للمشاركة... أو لا." },
    image: boxOpen,
  },
  {
    id: "drinks",
    name: { en: "Drinks & coffee", ar: "مشروبات وقهوة" },
    description: { en: "Iced, blended or hot.", ar: "مثلّج، مخفوق أو سخن." },
    image: icedTrio,
  },
];

export const items: MenuItem[] = [
  {
    id: "nutella",
    category: "crepes",
    price: 6.5,
    tag: "fav",
    name: { en: "Nutella Crêpe", ar: "كريب نوتيلا" },
    description: {
      en: "Warm crêpe, melty Nutella and fresh strawberries, finished with powdered sugar.",
      ar: "كريب سخن، نوتيلا ذايبة وفريز طازة، مع رشّة سكر ناعم.",
    },
  },
  {
    id: "strawberry",
    category: "crepes",
    price: 7.5,
    name: { en: "Strawberry Crêpe", ar: "كريب فريز" },
    description: {
      en: "Fresh strawberries, white chocolate and a cloud of whipped cream.",
      ar: "فريز طازة، شوكولا بيضاء وغيمة كريمة مخفوقة.",
    },
  },
  {
    id: "banana",
    category: "crepes",
    price: 6,
    name: { en: "Banana Crêpe", ar: "كريب موز" },
    description: {
      en: "Sliced banana, milk chocolate and hazelnut crunch.",
      ar: "موز مقطّع، شوكولا بالحليب وبندق مقرمش.",
    },
  },
  {
    id: "lotus",
    category: "crepes",
    price: 7,
    name: { en: "Lotus Crêpe", ar: "كريب لوتس" },
    description: {
      en: "Lotus spread, crushed Lotus biscuit and whipped cream.",
      ar: "كريمة لوتس، بسكوت لوتس مطحون وكريمة مخفوقة.",
    },
  },
  {
    id: "dubai",
    category: "crepes",
    price: 8.5,
    tag: "limited",
    name: { en: "Dubai Crêpe", ar: "كريب دبي" },
    description: {
      en: "Pistachio cream, crispy kunafa and dark chocolate.",
      ar: "كريمة فستق، كنافة مقرمشة وشوكولا داكنة.",
    },
  },
  {
    id: "waffle",
    category: "waffles",
    price: 6.5,
    tag: "fav",
    name: { en: "Strawberry Waffle", ar: "وافل فريز" },
    description: {
      en: "Crispy outside. Soft inside. Covered in chocolate.",
      ar: "مقرمش من برّا، طري من جوّا، ومغطّى بالشوكولا.",
    },
  },
  {
    id: "waffle-banana",
    category: "waffles",
    price: 6.5,
    name: { en: "Banana Choco Waffle", ar: "وافل موز وشوكولا" },
    description: {
      en: "Warm waffle, banana, chocolate drip and hazelnut crunch.",
      ar: "وافل سخن، موز، شوكولا سايحة وبندق مقرمش.",
    },
  },
  {
    id: "pancakes",
    category: "pancakes",
    price: 6,
    name: { en: "Classic Stack", ar: "بان كيك كلاسيك" },
    description: {
      en: "Fluffy pancakes, chocolate sauce and fresh strawberries.",
      ar: "بان كيك هشّ، صوص شوكولا وفريز طازة.",
    },
  },
  {
    id: "pancakes-berry",
    category: "pancakes",
    price: 6.5,
    name: { en: "Berry Pancakes", ar: "بان كيك بالتوت" },
    description: {
      en: "Blueberries, strawberries and a warm chocolate drizzle.",
      ar: "توت أزرق، فريز وشوكولا سخنة.",
    },
  },
  {
    id: "rolls",
    category: "rolls",
    price: 5.5,
    tag: "fav",
    name: { en: "Oreo Ice Cream Rolls", ar: "آيس كريم رولز أوريو" },
    description: {
      en: "Rolled fresh, your way. Oreo, chocolate and whipped cream.",
      ar: "بينلفّ طازة عذوقك: أوريو، شوكولا وكريمة.",
    },
  },
  {
    id: "sundae",
    category: "rolls",
    price: 5,
    name: { en: "Three-Scoop Sundae", ar: "سانديه 3 بولات" },
    description: {
      en: "Strawberry, chocolate and vanilla over biscuit crumble.",
      ar: "فريز، شوكولا وفانيلا فوق بسكوت مطحون.",
    },
  },
  {
    id: "profiteroles",
    category: "bakes",
    price: 5.5,
    name: { en: "Profiteroles", ar: "بروفيترول" },
    description: {
      en: "Choux puffs under warm chocolate and hazelnut crumble.",
      ar: "كرات شو تحت شوكولا سخنة وبندق مطحون.",
    },
  },
  {
    id: "brookie",
    category: "bakes",
    price: 4.5,
    tag: "new",
    name: { en: "Brookie", ar: "بروكي" },
    description: {
      en: "Part cookie. Part brownie. Served warm.",
      ar: "نصّه كوكيز ونصّه براوني. بينقدّم سخن.",
    },
  },
  {
    id: "box",
    category: "boxes",
    price: 18,
    tag: "fav",
    name: { en: "Sweet Spot Box", ar: "علبة سويت سبوت" },
    description: {
      en: "Mini crêpes, waffle bites, profiteroles and strawberries.",
      ar: "ميني كريب، قطع وافل، بروفيترول وفريز.",
    },
  },
  {
    id: "box-profiteroles",
    category: "boxes",
    price: 15,
    name: { en: "Profiterole Box", ar: "علبة بروفيترول" },
    description: {
      en: "A dozen profiteroles, chocolate and fresh strawberries.",
      ar: "دزينة بروفيترول، شوكولا وفريز طازة.",
    },
  },
  {
    id: "iced-latte",
    category: "drinks",
    price: 4,
    name: { en: "Iced Caramel Latte", ar: "آيس لاتيه كراميل" },
    description: { en: "Cold, creamy, a little caramel.", ar: "بارد، كريمي، مع لمسة كراميل." },
  },
  {
    id: "matcha",
    category: "drinks",
    price: 4.5,
    name: { en: "Iced Matcha", ar: "آيس ماتشا" },
    description: { en: "Ceremonial matcha over cold milk.", ar: "ماتشا فاخرة فوق حليب بارد." },
  },
  {
    id: "shake",
    category: "drinks",
    price: 5,
    name: { en: "Strawberry Milkshake", ar: "ميلك شيك فريز" },
    description: { en: "Thick, cold, real strawberries.", ar: "كثيف، بارد، وفريز حقيقي." },
  },
  {
    id: "frappe",
    category: "drinks",
    price: 4.5,
    name: { en: "Mocha Frappé", ar: "فرابيه موكا" },
    description: {
      en: "Blended coffee, chocolate and whipped cream.",
      ar: "قهوة مخفوقة، شوكولا وكريمة.",
    },
  },
  {
    id: "latte",
    category: "drinks",
    price: 3,
    name: { en: "Hot Latte", ar: "لاتيه سخن" },
    description: { en: "Double shot, steamed milk.", ar: "شوتين إسبريسو وحليب مبخّر." },
  },
];

/** Party box = regular box + the "party" size add-on. */
export const PARTY_BOX_EXTRA = 12;

export const WEEKLY_SPECIAL_ID = "rolls";

export const formatPrice = (amount: number) => `$${amount.toFixed(2)}`;

/** Short form for whole-dollar prices ($18 rather than $18.00). */
export const formatPriceShort = (amount: number) =>
  Number.isInteger(amount) ? `$${amount}` : formatPrice(amount);

export const getItem = (id: string) => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown menu item: ${id}`);
  return item;
};

export const lowestPrice = (category: CategoryId) =>
  Math.min(...items.filter((i) => i.category === category).map((i) => i.price));
