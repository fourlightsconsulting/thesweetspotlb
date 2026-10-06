// The Tripoli menu, imported from the old site's database (Firestore) on
// 2026-10-06: names tidied, Arabic added, prices in integer cents. It moves to
// Supabase with the admin side; the shapes mirror the planned tables
// (categories, products, option groups and options, and the links between them).
import type { StaticImageData } from "next/image";
import type { Locale } from "@/i18n/config";
import belgianChocolateCrepe from "@/assets/images/menu/belgian-chocolate-crepe.webp";
import belgianChocolatePancakes from "@/assets/images/menu/belgian-chocolate-pancakes.webp";
import belgianChocolateWaffle from "@/assets/images/menu/belgian-chocolate-waffle.webp";
import berrySmoothie from "@/assets/images/menu/berry-smoothie.webp";
import blueHawaii from "@/assets/images/menu/blue-hawaii.webp";
import blueOcean from "@/assets/images/menu/blue-ocean.webp";
import brownieCrepeSandwich from "@/assets/images/menu/brownie-crepe-sandwich.webp";
import caramelMilkshake from "@/assets/images/menu/caramel-milkshake.webp";
import chocolateMilkshake from "@/assets/images/menu/chocolate-milkshake.webp";
import coconutMangoSmoothie from "@/assets/images/menu/coconut-mango-smoothie.webp";
import creamyProfiteroles from "@/assets/images/menu/creamy-profiteroles.webp";
import crunchyBowl from "@/assets/images/menu/crunchy-bowl.webp";
import darkChocolateCrepe from "@/assets/images/menu/dark-chocolate-crepe.webp";
import darkChocolatePancakes from "@/assets/images/menu/dark-chocolate-pancakes.webp";
import darkChocolateWaffle from "@/assets/images/menu/dark-chocolate-waffle.webp";
import dubaiCrepe from "@/assets/images/menu/dubai-crepe.webp";
import fettuccineCrepe from "@/assets/images/menu/fettuccine-crepe.webp";
import fruityBowl from "@/assets/images/menu/fruity-bowl.webp";
import fruityCrepe from "@/assets/images/menu/fruity-crepe.webp";
import fruityIceCreamRolls from "@/assets/images/menu/fruity-ice-cream-rolls.webp";
import hyperKiwi from "@/assets/images/menu/hyper-kiwi.webp";
import iceCreamProfiteroles from "@/assets/images/menu/ice-cream-profiteroles.webp";
import lotusCrepe from "@/assets/images/menu/lotus-crepe.webp";
import lotusIceCreamRolls from "@/assets/images/menu/lotus-ice-cream-rolls.webp";
import lotusMilkshake from "@/assets/images/menu/lotus-milkshake.webp";
import lotusPancakes from "@/assets/images/menu/lotus-pancakes.webp";
import lotusWaffle from "@/assets/images/menu/lotus-waffle.webp";
import mangoSmoothie from "@/assets/images/menu/mango-smoothie.webp";
import mangotic from "@/assets/images/menu/mangotic.webp";
import nutellaCrepe from "@/assets/images/menu/nutella-crepe.webp";
import nutellaIceCreamRolls from "@/assets/images/menu/nutella-ice-cream-rolls.webp";
import nutellaPancakes from "@/assets/images/menu/nutella-pancakes.webp";
import nutellaWaffle from "@/assets/images/menu/nutella-waffle.webp";
import orangeJuice from "@/assets/images/menu/orange-juice.webp";
import oreoMilkshake from "@/assets/images/menu/oreo-milkshake.webp";
import passionMojito from "@/assets/images/menu/passion-mojito.webp";
import pistachioIceCreamRolls from "@/assets/images/menu/pistachio-ice-cream-rolls.webp";
import premiumWaffleStick from "@/assets/images/menu/premium-waffle-stick.webp";
import sanSebastianCheesecake from "@/assets/images/menu/san-sebastian-cheesecake.webp";
import strawberryBowl from "@/assets/images/menu/strawberry-bowl.webp";
import strawberryBox from "@/assets/images/menu/strawberry-box.webp";
import strawberryMilkshake from "@/assets/images/menu/strawberry-milkshake.webp";
import strawberryMojito from "@/assets/images/menu/strawberry-mojito.webp";
import strawberrySmoothie from "@/assets/images/menu/strawberry-smoothie.webp";
import sushiCrepe from "@/assets/images/menu/sushi-crepe.webp";
import sweetSpotBox from "@/assets/images/menu/sweet-spot-box.webp";
import triBox from "@/assets/images/menu/tri-box.webp";
import waffleStick from "@/assets/images/menu/waffle-stick.webp";
import whiteChocolateCrepe from "@/assets/images/menu/white-chocolate-crepe.webp";
import whiteChocolatePancakes from "@/assets/images/menu/white-chocolate-pancakes.webp";
import whiteChocolateWaffle from "@/assets/images/menu/white-chocolate-waffle.webp";

export type Localized = Record<Locale, string>;

export type CategoryId =
  "crepes" | "waffles" | "pancakes" | "profiteroles" | "rolls" | "bowls" | "boxes" | "drinks";

export type Category = {
  id: CategoryId;
  name: Localized;
  description: Localized;
  image: StaticImageData;
  /** Optional headings inside the category (drinks). */
  subcategories?: { id: string; name: Localized }[];
};

/** One choice inside a group. Option ids are unique within their group. */
export type MenuOption = { id: string; name: Localized; price: number };

/**
 * A set of choices. `min`/`max` set the rule: min 1 + max 1 is a required
 * single choice; min 0 is optional, up to `max`.
 */
export type OptionGroup = {
  id: string;
  name: Localized;
  min: number;
  max: number;
  options: MenuOption[];
};

export type ItemTag = "fav" | "new" | "limited";

export type MenuItem = {
  id: string;
  category: CategoryId;
  subcategory?: string;
  price: number;
  tag?: ItemTag;
  name: Localized;
  description: Localized;
  /** Missing until the shop photographs it; the menu shows a branded tile. */
  image?: StaticImageData;
  /** Option groups, in the order the customiser shows them. */
  groups: string[];
  /** Preselected options. Required choices without one start empty. */
  defaults?: Record<string, string | string[]>;
  /** False while sold out: still listed, but it can't be ordered. */
  available?: boolean;
};

export type Menu = {
  categories: Category[];
  items: MenuItem[];
  groups: Record<string, OptionGroup>;
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
    image: lotusWaffle,
  },
  {
    id: "pancakes",
    name: { en: "Pancakes", ar: "بان كيك" },
    description: {
      en: "Fluffy stacks, drizzled to order.",
      ar: "طبقات منفوشة مع الصوص اللي بتحبه.",
    },
    image: nutellaPancakes,
  },
  {
    id: "profiteroles",
    name: { en: "Profiteroles", ar: "بروفيترول" },
    description: { en: "Bite-size and covered in chocolate.", ar: "لقمة صغيرة مغطّاة بالشوكولا." },
    image: creamyProfiteroles,
  },
  {
    id: "rolls",
    name: { en: "Ice cream rolls", ar: "آيس كريم رولز" },
    description: { en: "Rolled fresh in front of you.", ar: "بينلفّ طازة قدّامك." },
    image: pistachioIceCreamRolls,
  },
  {
    id: "bowls",
    name: { en: "Bowls & cheesecake", ar: "بولز وتشيز كيك" },
    description: { en: "Piled high and made fresh.", ar: "مليانة ومعمولة طازة." },
    image: strawberryBowl,
  },
  {
    id: "boxes",
    name: { en: "Dessert boxes", ar: "علب الحلو" },
    description: { en: "Made for sharing. Or not.", ar: "للمشاركة... أو لا." },
    image: sweetSpotBox,
  },
  {
    id: "drinks",
    name: { en: "Cold drinks", ar: "مشروبات باردة" },
    description: { en: "Shakes, smoothies and fresh mixes.", ar: "ميلك شيك، سموذي وميكس طازة." },
    image: strawberryMilkshake,
    subcategories: [
      { id: "milkshakes", name: { en: "Milkshakes", ar: "ميلك شيك" } },
      { id: "smoothies", name: { en: "Smoothies", ar: "سموذي" } },
      { id: "mixes", name: { en: "Mixed drinks", ar: "ميكس" } },
      { id: "juice", name: { en: "Fresh juice", ar: "عصير طازة" } },
      { id: "water", name: { en: "Water", ar: "مياه" } },
    ],
  },
];

const option = (id: string, en: string, ar: string, price = 0): MenuOption => ({
  id,
  name: { en, ar },
  price,
});

export const optionGroups: Record<string, OptionGroup> = {
  // Required: the dessert comes with one of these.
  chocolate: {
    id: "chocolate",
    name: { en: "Chocolate", ar: "الشوكولا" },
    min: 1,
    max: 1,
    options: [
      option("belgian", "Belgian chocolate", "شوكولا بلجيكية"),
      option("dark", "Dark chocolate", "شوكولا داكنة"),
      option("lotus", "Lotus", "لوتس"),
      option("nutella", "Nutella", "نوتيلا"),
      option("white", "White chocolate", "شوكولا بيضاء"),
    ],
  },
  // Required: the dessert comes with one of these.
  stick: {
    id: "stick",
    name: { en: "Dipped in", ar: "مغطّسة بـ" },
    min: 1,
    max: 1,
    options: [
      option("lotus", "Lotus", "لوتس"),
      option("nutella", "Nutella", "نوتيلا"),
      option("white", "White chocolate", "شوكولا بيضاء"),
    ],
  },
  // Required: the dessert comes with one of these.
  "stick-premium": {
    id: "stick-premium",
    name: { en: "Dipped in", ar: "مغطّسة بـ" },
    min: 1,
    max: 1,
    options: [
      option("belgian", "Belgian chocolate", "شوكولا بلجيكية"),
      option("dark", "Dark chocolate", "شوكولا داكنة"),
    ],
  },
  "extra-chocolate": {
    id: "extra-chocolate",
    name: { en: "Extra chocolate", ar: "شوكولا إضافية" },
    min: 0,
    max: 5,
    options: [
      option("belgian", "Belgian chocolate", "شوكولا بلجيكية", 300),
      option("dark", "Dark chocolate", "شوكولا داكنة", 300),
      option("lotus", "Lotus spread", "كريمة لوتس", 300),
      option("nutella", "Nutella", "نوتيلا", 300),
      option("white", "White chocolate", "شوكولا بيضاء", 300),
    ],
  },
  fruit: {
    id: "fruit",
    name: { en: "Fresh fruit", ar: "فواكه طازة" },
    min: 0,
    max: 5,
    options: [
      option("banana", "Banana", "موز", 150),
      option("kiwi", "Kiwi", "كيوي", 150),
      option("pineapple", "Pineapple", "أناناس", 150),
      option("mixed", "Mixed fruit", "فواكه مشكّلة", 200),
      option("strawberry", "Strawberries", "فريز", 200),
    ],
  },
  toppings: {
    id: "toppings",
    name: { en: "Toppings", ar: "الإضافات" },
    min: 0,
    max: 8,
    options: [
      option("rice-chocolate", "Chocolate rice crispies", "رز مقرمش بالشوكولا", 50),
      option("vermicelli", "Chocolate vermicelli", "شعيرية شوكولا", 50),
      option("crispy-balls", "Crispy balls", "كرات مقرمشة", 50),
      option("crispy-flakes", "Crispy flakes", "رقائق مقرمشة", 50),
      option("marshmallow", "Marshmallows", "مارشميلو", 50),
      option("smarties", "Smarties", "سمارتيز", 50),
      option("sprinkles", "Sprinkles", "سبرينكلز", 50),
      option("rice-vanilla", "Vanilla rice crispies", "رز مقرمش بالفانيلا", 50),
    ],
  },
  bars: {
    id: "bars",
    name: { en: "Chocolate bars & cookies", ar: "ألواح شوكولا وبسكويت" },
    min: 0,
    max: 5,
    options: [
      option("brownie", "Brownie", "براوني", 150),
      option("kinder", "Kinder", "كيندر", 150),
      option("kinder-bueno", "Kinder Bueno", "كيندر بوينو", 150),
      option("kinder-bueno-white", "Kinder Bueno White", "كيندر بوينو أبيض", 150),
      option("oreo", "Oreo", "أوريو", 150),
    ],
  },
  nuts: {
    id: "nuts",
    name: { en: "Nuts", ar: "مكسّرات" },
    min: 0,
    max: 4,
    options: [
      option("almond", "Almonds", "لوز", 100),
      option("hazelnut", "Hazelnuts", "بندق", 100),
      option("peanut", "Peanuts", "فستق عبيد", 100),
      option("pistachio", "Pistachios", "فستق حلبي", 100),
    ],
  },
};

/** Add-ons for crêpes, waffles, pancakes, profiteroles and ice cream rolls. */
const addOns = ["extra-chocolate", "fruit", "toppings", "bars", "nuts"];

export const items: MenuItem[] = [
  {
    id: "lotus-crepe",
    category: "crepes",
    price: 500,
    name: { en: "Lotus Crêpe", ar: "كريب لوتس" },
    description: { en: "Lotus spread and Lotus biscuits.", ar: "كريمة لوتس وبسكوت لوتس." },
    image: lotusCrepe,
    groups: [...addOns],
  },
  {
    id: "nutella-crepe",
    category: "crepes",
    price: 500,
    name: { en: "Nutella Crêpe", ar: "كريب نوتيلا" },
    description: { en: "Nutella chocolate spread.", ar: "شوكولا نوتيلا." },
    image: nutellaCrepe,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-crepe",
    category: "crepes",
    price: 500,
    name: { en: "White Chocolate Crêpe", ar: "كريب شوكولا بيضاء" },
    description: { en: "Premium white chocolate.", ar: "شوكولا بيضاء فاخرة." },
    image: whiteChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-crepe",
    category: "crepes",
    price: 750,
    name: { en: "Belgian Chocolate Crêpe", ar: "كريب شوكولا بلجيكية" },
    description: { en: "Premium Belgian chocolate.", ar: "شوكولا بلجيكية فاخرة." },
    image: belgianChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-crepe",
    category: "crepes",
    price: 750,
    name: { en: "Dark Chocolate Crêpe", ar: "كريب شوكولا داكنة" },
    description: { en: "Dark chocolate.", ar: "شوكولا داكنة." },
    image: darkChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "fettuccine-crepe",
    category: "crepes",
    price: 800,
    name: { en: "Fettuccine Crêpe", ar: "كريب فيتوتشيني" },
    description: {
      en: "Crêpe cut into ribbons, with a scoop of ice cream and a Belgian chocolate dip.",
      ar: "كريب مقطّع شرايط، مع بولة آيس كريم وصوص شوكولا بلجيكية للتغميس.",
    },
    image: fettuccineCrepe,
    groups: [...addOns],
  },
  {
    id: "fruity-crepe",
    category: "crepes",
    price: 850,
    name: { en: "Fruity Crêpe", ar: "كريب بالفواكه" },
    description: { en: "Mixed fresh fruit.", ar: "فواكه طازة مشكّلة." },
    image: fruityCrepe,
    groups: [...addOns],
  },
  {
    id: "brownie-crepe-sandwich",
    category: "crepes",
    price: 1000,
    name: { en: "Brownie Crêpe Sandwich", ar: "ساندويش كريب براوني" },
    description: {
      en: "Brownies with strawberry, banana, crème pâtissière and white chocolate.",
      ar: "براوني مع فريز، موز، كريما باتيسيير وشوكولا بيضاء.",
    },
    image: brownieCrepeSandwich,
    groups: [...addOns],
  },
  {
    id: "sushi-crepe",
    category: "crepes",
    price: 1000,
    name: { en: "Sushi Crêpe", ar: "كريب سوشي" },
    description: {
      en: "Eight crêpe rolls, sushi style, with a Belgian chocolate dip.",
      ar: "8 لفّات كريب على طريقة السوشي، مع صوص شوكولا بلجيكية للتغميس.",
    },
    image: sushiCrepe,
    groups: [...addOns],
  },
  {
    id: "dubai-crepe",
    category: "crepes",
    price: 1222,
    name: { en: "Dubai Crêpe", ar: "كريب دبي" },
    description: {
      en: "Pistachio cream, crispy kunafa and chocolate.",
      ar: "كريمة فستق، كنافة مقرمشة وشوكولا.",
    },
    image: dubaiCrepe,
    groups: [...addOns],
  },
  {
    id: "waffle-stick",
    category: "waffles",
    price: 450,
    name: { en: "Waffle Stick", ar: "عصا وافل" },
    description: {
      en: "One waffle stick, dipped in Lotus, Nutella or white chocolate.",
      ar: "عصا وافل وحدة، مغطّسة بلوتس، نوتيلا أو شوكولا بيضاء.",
    },
    image: waffleStick,
    groups: ["stick", ...addOns],
  },
  {
    id: "premium-waffle-stick",
    category: "waffles",
    price: 600,
    name: { en: "Premium Waffle Stick", ar: "عصا وافل بريميوم" },
    description: {
      en: "One waffle stick, dipped in Belgian or dark chocolate.",
      ar: "عصا وافل وحدة، مغطّسة بشوكولا بلجيكية أو داكنة.",
    },
    image: premiumWaffleStick,
    groups: ["stick-premium", ...addOns],
  },
  {
    id: "lotus-waffle",
    category: "waffles",
    price: 700,
    name: { en: "Lotus Waffle", ar: "وافل لوتس" },
    description: { en: "Lotus spread and Lotus biscuits.", ar: "كريمة لوتس وبسكوت لوتس." },
    image: lotusWaffle,
    groups: [...addOns],
  },
  {
    id: "nutella-waffle",
    category: "waffles",
    price: 700,
    name: { en: "Nutella Waffle", ar: "وافل نوتيلا" },
    description: { en: "Nutella chocolate spread.", ar: "شوكولا نوتيلا." },
    image: nutellaWaffle,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-waffle",
    category: "waffles",
    price: 700,
    name: { en: "White Chocolate Waffle", ar: "وافل شوكولا بيضاء" },
    description: { en: "Premium white chocolate.", ar: "شوكولا بيضاء فاخرة." },
    image: whiteChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-waffle",
    category: "waffles",
    price: 1000,
    name: { en: "Belgian Chocolate Waffle", ar: "وافل شوكولا بلجيكية" },
    description: { en: "Premium Belgian chocolate.", ar: "شوكولا بلجيكية فاخرة." },
    image: belgianChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-waffle",
    category: "waffles",
    price: 1000,
    name: { en: "Dark Chocolate Waffle", ar: "وافل شوكولا داكنة" },
    description: { en: "Dark chocolate.", ar: "شوكولا داكنة." },
    image: darkChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "lotus-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "Lotus Pancakes", ar: "بان كيك لوتس" },
    description: { en: "Lotus spread and Lotus biscuits.", ar: "كريمة لوتس وبسكوت لوتس." },
    image: lotusPancakes,
    groups: [...addOns],
  },
  {
    id: "nutella-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "Nutella Pancakes", ar: "بان كيك نوتيلا" },
    description: { en: "Nutella chocolate spread.", ar: "شوكولا نوتيلا." },
    image: nutellaPancakes,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "White Chocolate Pancakes", ar: "بان كيك شوكولا بيضاء" },
    description: { en: "Premium white chocolate.", ar: "شوكولا بيضاء فاخرة." },
    image: whiteChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-pancakes",
    category: "pancakes",
    price: 1000,
    name: { en: "Belgian Chocolate Pancakes", ar: "بان كيك شوكولا بلجيكية" },
    description: { en: "Premium Belgian chocolate.", ar: "شوكولا بلجيكية فاخرة." },
    image: belgianChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-pancakes",
    category: "pancakes",
    price: 1000,
    name: { en: "Dark Chocolate Pancakes", ar: "بان كيك شوكولا داكنة" },
    description: { en: "Dark chocolate.", ar: "شوكولا داكنة." },
    image: darkChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "creamy-profiteroles",
    category: "profiteroles",
    price: 1000,
    name: { en: "Creamy Profiteroles", ar: "بروفيترول بالكريما" },
    description: {
      en: "Filled with crème pâtissière, with strawberries and the chocolate of your choice.",
      ar: "محشي كريما باتيسيير، مع فريز والشوكولا اللي بتختارها.",
    },
    image: creamyProfiteroles,
    groups: ["chocolate", ...addOns],
  },
  {
    id: "ice-cream-profiteroles",
    category: "profiteroles",
    price: 1000,
    name: { en: "Ice Cream Profiteroles", ar: "بروفيترول بالآيس كريم" },
    description: {
      en: "Filled with vanilla ice cream, with the chocolate of your choice.",
      ar: "محشي آيس كريم فانيلا، مع الشوكولا اللي بتختارها.",
    },
    image: iceCreamProfiteroles,
    groups: ["chocolate", ...addOns],
  },
  {
    id: "fruity-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Fruity Ice Cream Rolls", ar: "آيس كريم رولز فواكه" },
    description: {
      en: "Fresh fruit, rolled into cold, creamy ice cream.",
      ar: "فواكه طازة بتنلفّ مع آيس كريم بارد وكريمي.",
    },
    image: fruityIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "lotus-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Lotus Ice Cream Rolls", ar: "آيس كريم رولز لوتس" },
    description: {
      en: "Rolled with Lotus Biscoff for a caramel crunch.",
      ar: "ملفوف مع لوتس بيسكوف، بطعمة كراميل مقرمشة.",
    },
    image: lotusIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "nutella-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Nutella Ice Cream Rolls", ar: "آيس كريم رولز نوتيلا" },
    description: {
      en: "Swirled with Nutella, rich and creamy.",
      ar: "ممزوج بالنوتيلا، غني وكريمي.",
    },
    image: nutellaIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "pistachio-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Pistachio Ice Cream Rolls", ar: "آيس كريم رولز فستق" },
    description: { en: "Pistachio, rolled fresh.", ar: "فستق حلبي، بينلفّ طازة." },
    image: pistachioIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "bueno-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Bueno Bowl", ar: "بول بوينو" },
    description: { en: "Loaded with Kinder Bueno.", ar: "مليان كيندر بوينو." },
    groups: [],
  },
  {
    id: "crunchy-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Crunchy Bowl", ar: "بول كرانشي" },
    description: {
      en: "Chocolate, strawberries and plenty of crunch.",
      ar: "شوكولا، فريز وكتير قرمشة.",
    },
    image: crunchyBowl,
    groups: [],
  },
  {
    id: "dubai-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Dubai Bowl", ar: "بول دبي" },
    description: { en: "Pistachio and kunafa, Dubai style.", ar: "فستق وكنافة، على طريقة دبي." },
    groups: [],
  },
  {
    id: "fruity-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Fruity Bowl", ar: "بول فواكه" },
    description: { en: "Fresh fruit, front and centre.", ar: "فواكه طازة على كيفك." },
    image: fruityBowl,
    groups: [],
  },
  {
    id: "marshmallow-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Marshmallow Bowl", ar: "بول مارشميلو" },
    description: { en: "Loaded with marshmallows.", ar: "مليان مارشميلو." },
    groups: [],
  },
  {
    id: "strawberry-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Strawberry Bowl", ar: "بول فريز" },
    description: { en: "Fresh strawberries by the spoonful.", ar: "فريز طازة بالمعلقة." },
    image: strawberryBowl,
    groups: [],
  },
  {
    id: "san-sebastian-cheesecake",
    category: "bowls",
    price: 700,
    name: { en: "San Sebastián Cheesecake", ar: "تشيز كيك سان سيباستيان" },
    description: {
      en: "Creamy Basque cheesecake with a caramelised top.",
      ar: "تشيز كيك باسكي كريمي بوجه مكرمل.",
    },
    image: sanSebastianCheesecake,
    groups: [],
  },
  {
    id: "strawberry-box",
    category: "boxes",
    price: 1100,
    name: { en: "Strawberry Box", ar: "علبة فريز" },
    description: { en: "Fresh strawberries with chocolate.", ar: "فريز طازة مع شوكولا." },
    image: strawberryBox,
    groups: [],
  },
  {
    id: "tri-box",
    category: "boxes",
    price: 1500,
    name: { en: "Tri-Box", ar: "تراي بوكس" },
    description: {
      en: "Pistachio, fettuccine and Lotus crêpes in one box.",
      ar: "كريب فستق، فيتوتشيني ولوتس بعلبة وحدة.",
    },
    image: triBox,
    groups: [],
  },
  {
    id: "sweet-spot-box",
    category: "boxes",
    price: 3300,
    name: { en: "Sweet Spot Box", ar: "علبة سويت سبوت" },
    description: {
      en: "A bit of everything: waffle bites, crêpe rolls, pancakes, brownies, profiteroles and strawberries, with four dips.",
      ar: "شوي من كل شي: قطع وافل، لفّات كريب، بان كيك، براوني، بروفيترول وفريز، مع 4 صوصات للتغميس.",
    },
    image: sweetSpotBox,
    groups: [],
  },
  {
    id: "caramel-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Caramel Milkshake", ar: "ميلك شيك كراميل" },
    description: { en: "Smooth caramel, blended cold.", ar: "كراميل ناعم، مخفوق بارد." },
    image: caramelMilkshake,
    groups: [],
  },
  {
    id: "chocolate-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Chocolate Milkshake", ar: "ميلك شيك شوكولا" },
    description: { en: "Rich chocolate, blended thick.", ar: "شوكولا غنية، مخفوقة كثيف." },
    image: chocolateMilkshake,
    groups: [],
  },
  {
    id: "lotus-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Lotus Milkshake", ar: "ميلك شيك لوتس" },
    description: { en: "Lotus Biscoff, blended thick.", ar: "لوتس بيسكوف، مخفوق كثيف." },
    image: lotusMilkshake,
    groups: [],
  },
  {
    id: "oreo-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Oreo Milkshake", ar: "ميلك شيك أوريو" },
    description: { en: "Cookies and cream in a cup.", ar: "كوكيز وكريمة بكاسة." },
    image: oreoMilkshake,
    groups: [],
  },
  {
    id: "strawberry-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Strawberry Milkshake", ar: "ميلك شيك فريز" },
    description: { en: "Thick, cold and full of strawberries.", ar: "كثيف، بارد ومليان فريز." },
    image: strawberryMilkshake,
    groups: [],
  },
  {
    id: "berry-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Berry Smoothie", ar: "سموذي توت" },
    description: { en: "Mixed berries, blended cold.", ar: "توت مشكّل، مخفوق بارد." },
    image: berrySmoothie,
    groups: [],
  },
  {
    id: "coconut-mango-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Coconut Mango Smoothie", ar: "سموذي جوز الهند ومانغو" },
    description: {
      en: "Mango and coconut, tropical and cold.",
      ar: "مانغو وجوز الهند، استوائي وبارد.",
    },
    image: coconutMangoSmoothie,
    groups: [],
  },
  {
    id: "mango-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Mango Smoothie", ar: "سموذي مانغو" },
    description: { en: "Ripe mango, blended smooth.", ar: "مانغو ناضجة، مخفوقة ناعمة." },
    image: mangoSmoothie,
    groups: [],
  },
  {
    id: "strawberry-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Strawberry Smoothie", ar: "سموذي فريز" },
    description: { en: "Fresh strawberries, blended.", ar: "فريز طازة مخفوقة." },
    image: strawberrySmoothie,
    groups: [],
  },
  {
    id: "blue-hawaii",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Blue Hawaii", ar: "بلو هاواي" },
    description: { en: "Tropical and ice-cold.", ar: "استوائي ومتلّج." },
    image: blueHawaii,
    groups: [],
  },
  {
    id: "blue-ocean",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Blue Ocean", ar: "بلو أوشن" },
    description: { en: "Cool, bright and blue.", ar: "بارد، منعش وأزرق." },
    image: blueOcean,
    groups: [],
  },
  {
    id: "hyper-kiwi",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Hyper Kiwi", ar: "هايبر كيوي" },
    description: { en: "Kiwi, cold and zesty.", ar: "كيوي بارد ومنعش." },
    image: hyperKiwi,
    groups: [],
  },
  {
    id: "mangotic",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Mangotic", ar: "مانغوتيك" },
    description: { en: "Mango, tropical and chilled.", ar: "مانغو استوائية ومبرّدة." },
    image: mangotic,
    groups: [],
  },
  {
    id: "passion-mojito",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Passion Mojito", ar: "موهيتو باشن فروت" },
    description: { en: "Passion fruit, mojito style.", ar: "باشن فروت، على طريقة الموهيتو." },
    image: passionMojito,
    groups: [],
  },
  {
    id: "strawberry-mojito",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Strawberry Mojito", ar: "موهيتو فريز" },
    description: { en: "Strawberry, mojito style.", ar: "فريز، على طريقة الموهيتو." },
    image: strawberryMojito,
    groups: [],
  },
  {
    id: "orange-juice",
    category: "drinks",
    subcategory: "juice",
    price: 222,
    name: { en: "Fresh Orange Juice", ar: "عصير برتقال طازة" },
    description: { en: "Freshly squeezed.", ar: "معصور طازة." },
    image: orangeJuice,
    groups: [],
  },
  {
    id: "water",
    category: "drinks",
    subcategory: "water",
    price: 100,
    name: { en: "Water", ar: "مياه" },
    description: { en: "A bottle of water.", ar: "قنينة مياه." },
    groups: [],
  },
];

export const menu: Menu = { categories, items, groups: optionGroups };

/** The weekly special on the home page (until campaigns move to the admin). */
export const WEEKLY_SPECIAL_ID = "fruity-ice-cream-rolls";

export const getItem = (id: string) => {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error(`Unknown menu item: ${id}`);
  return item;
};

/** The cheapest base price in a category, for "From $X" labels. */
export const lowestPrice = (category: CategoryId) =>
  Math.min(...items.filter((i) => i.category === category).map((i) => i.price));
