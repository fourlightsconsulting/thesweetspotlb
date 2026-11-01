// The menu's shapes, and the Tripoli menu as imported from the old site's
// database (Firestore) on 2026-10-06. The live menu comes from Supabase
// (src/server/catalog.ts); this copy is the fallback while Supabase isn't
// configured (development, tests) and the source of the bundled photos.
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

/** A category's slug; the built-in ones have menu icons (src/components/icons.tsx). */
export type CategoryId = string;

export type Category = {
  id: CategoryId;
  name: Localized;
  description: Localized;
  /** Missing only for a category whose items have no photo yet. */
  image?: StaticImageData;
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

/**
 * One pick in a bundle: the menu items to choose from, each with its
 * surcharge in cents. A slot with a single item is a fixed part.
 */
export type BundleSlot = {
  id: string;
  name: Localized;
  choices: { itemId: string; price: number }[];
};

export type MenuItem = {
  id: string;
  category: CategoryId;
  subcategory?: string;
  price: number;
  tag?: ItemTag;
  name: Localized;
  description: Localized;
  /**
   * Missing until the shop photographs it; the menu shows a branded tile.
   * Bundled photos are static imports; uploaded ones are storage URLs.
   */
  image?: StaticImageData;
  /** Option groups, in the order the customiser shows them. */
  groups: string[];
  /** Preselected options. Required choices without one start empty. */
  defaults?: Record<string, string | string[]>;
  /** False while sold out: still listed, but it can't be ordered. */
  available?: boolean;
  /** Bundles only: the picks, in order. Picked items keep their own groups. */
  slots?: BundleSlot[];
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
      en: "Thin crêpes with chocolate, spreads or fruit.",
      ar: "كريب رقيق مع شوكولا، لوتس أو فواكه.",
    },
    image: nutellaCrepe,
  },
  {
    id: "waffles",
    name: { en: "Waffles", ar: "وافل" },
    description: {
      en: "Crisp on the outside, soft on the inside.",
      ar: "وافل مقرمش من برّا وطري من جوّا.",
    },
    image: lotusWaffle,
  },
  {
    id: "pancakes",
    name: { en: "Pancakes", ar: "بان كيك" },
    description: {
      en: "Fluffy pancakes filled with chocolate or Lotus spread, with a mix of chocolates on top.",
      ar: "بان كيك محشي شوكولا أو كريمة لوتس ومغطّى بميكس من الشوكولا.",
    },
    image: nutellaPancakes,
  },
  {
    id: "profiteroles",
    name: { en: "Profiteroles", ar: "بروفيترول" },
    description: {
      en: "Pastry puffs filled with cream or ice cream, with your choice of sauce.",
      ar: "بروفيترول محشي كريما أو آيس كريم، مع الشوكولا اللي بتختارها.",
    },
    image: creamyProfiteroles,
  },
  {
    id: "rolls",
    name: { en: "Ice cream rolls", ar: "آيس كريم رولز" },
    description: {
      en: "Freshly prepared ice cream rolls in a variety of flavors.",
      ar: "آيس كريم رولز بنكهات مختلفة.",
    },
    image: pistachioIceCreamRolls,
  },
  {
    id: "bowls",
    name: { en: "Dessert bowls & cheesecake", ar: "بولز وتشيز كيك" },
    description: {
      en: "Dessert bowls with a variety of toppings, plus San Sebastián cheesecake.",
      ar: "بولز بإضافات مختلفة، وتشيز كيك سان سيباستيان.",
    },
    image: strawberryBowl,
  },
  {
    id: "boxes",
    name: { en: "Dessert boxes", ar: "علب الحلو" },
    description: { en: "A selection of dessert boxes to share.", ar: "علب حلو للمشاركة." },
    image: sweetSpotBox,
  },
  {
    id: "drinks",
    name: { en: "Cold drinks", ar: "مشروبات باردة" },
    description: {
      en: "Milkshakes, smoothies, mixed drinks, fresh juice and water.",
      ar: "ميلك شيك، سموذي، ميكسات، عصير طازة ومياه.",
    },
    image: strawberryMilkshake,
    subcategories: [
      { id: "milkshakes", name: { en: "Milkshakes", ar: "ميلك شيك" } },
      { id: "smoothies", name: { en: "Smoothies", ar: "سموذي" } },
      { id: "mixes", name: { en: "Mixed drinks", ar: "ميكسات" } },
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
    name: { en: "Sauce", ar: "اختيارك من الشوكولا" },
    min: 1,
    max: 1,
    options: [
      option("belgian", "Belgian chocolate", "شوكولا بلجيكية"),
      option("dark", "Dark chocolate", "شوكولا داكنة"),
      option("lotus", "Lotus spread", "كريمة لوتس"),
      option("nutella", "Nutella", "نوتيلا"),
      option("white", "White chocolate", "شوكولا بيضا"),
    ],
  },
  // Required: the dessert comes with one of these.
  stick: {
    id: "stick",
    name: { en: "Coating", ar: "اختيارك من الشوكولا" },
    min: 1,
    max: 1,
    options: [
      option("lotus", "Lotus spread", "كريمة لوتس"),
      option("nutella", "Nutella", "نوتيلا"),
      option("white", "White chocolate", "شوكولا بيضا"),
    ],
  },
  // Required: the dessert comes with one of these.
  "stick-premium": {
    id: "stick-premium",
    name: { en: "Coating", ar: "اختيارك من الشوكولا" },
    min: 1,
    max: 1,
    options: [
      option("belgian", "Belgian milk chocolate", "شوكولا بلجيكية بالحليب"),
      option("dark", "Belgian dark chocolate", "شوكولا بلجيكية داكنة"),
    ],
  },
  "extra-chocolate": {
    id: "extra-chocolate",
    name: { en: "Extra sauce", ar: "شوكولا زيادة" },
    min: 0,
    max: 5,
    options: [
      option("belgian", "Belgian chocolate", "شوكولا بلجيكية", 300),
      option("dark", "Dark chocolate", "شوكولا داكنة", 300),
      option("lotus", "Lotus spread", "كريمة لوتس", 300),
      option("nutella", "Nutella", "نوتيلا", 300),
      option("white", "White chocolate", "شوكولا بيضا", 300),
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
      option("vermicelli", "Chocolate vermicelli", "سبرينكلز شوكولا", 50),
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
    name: { en: "Chocolate, cookies & brownies", ar: "شوكولا، بسكويت وبراوني" },
    min: 0,
    max: 5,
    options: [
      option("brownie", "Brownie", "براوني", 150),
      option("kinder", "Kinder", "كيندر", 150),
      option("kinder-bueno", "Kinder Bueno", "كيندر بوينو", 150),
      option("kinder-bueno-white", "Kinder Bueno White", "كيندر بوينو وايت", 150),
      option("oreo", "Oreo", "أوريو", 150),
    ],
  },
  nuts: {
    id: "nuts",
    name: { en: "Nuts", ar: "مكسرات" },
    min: 0,
    max: 4,
    options: [
      option("almond", "Almonds", "لوز", 100),
      option("hazelnut", "Hazelnuts", "بندق", 100),
      option("peanut", "Peanuts", "فول سوداني", 100),
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
    description: {
      en: "Crêpe filled with Lotus spread and topped with a mix of chocolate.",
      ar: "كريب محشي بكريمة لوتس ومغطّى بميكس من الشوكولا.",
    },
    image: lotusCrepe,
    groups: [...addOns],
  },
  {
    id: "nutella-crepe",
    category: "crepes",
    price: 500,
    name: { en: "Nutella Crêpe", ar: "كريب نوتيلا" },
    description: {
      en: "Crêpe filled with Nutella and topped with a mix of chocolate.",
      ar: "كريب محشي نوتيلا ومغطّى بميكس من الشوكولا.",
    },
    image: nutellaCrepe,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-crepe",
    category: "crepes",
    price: 500,
    name: { en: "White Chocolate Crêpe", ar: "كريب بالشوكولاتة البيضاء" },
    description: {
      en: "Crêpe filled with white chocolate and topped with a mix of chocolate.",
      ar: "كريب محشي شوكولا بيضا ومغطّى بميكس من الشوكولا.",
    },
    image: whiteChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-crepe",
    category: "crepes",
    price: 750,
    name: { en: "Belgian Chocolate Crêpe", ar: "كريب بالشوكولاتة البلجيكية" },
    description: {
      en: "Crêpe filled with Belgian chocolate and topped with Belgian milk, white and dark chocolate.",
      ar: "كريب محشي شوكولا بلجيكية ومغطّى بشوكولا بلجيكية بالحليب، بيضا وداكنة.",
    },
    image: belgianChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-crepe",
    category: "crepes",
    price: 750,
    name: { en: "Dark Chocolate Crêpe", ar: "كريب بالشوكولاتة الداكنة" },
    description: {
      en: "Crêpe filled with dark chocolate and topped with a mix of chocolate.",
      ar: "كريب محشي شوكولا داكنة ومغطّى بميكس من الشوكولا.",
    },
    image: darkChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "fettuccine-crepe",
    category: "crepes",
    price: 800,
    name: { en: "Fettuccine Crêpe", ar: "كريب فيتوتشيني" },
    description: {
      en: "Crêpe ribbons topped with your favorite chocolate and served with a scoop of ice cream of your choice.",
      ar: "كريب مقطّع شرايط ومغطّى بالشوكولا اللي بتختارها، مع سكوب آيس كريم من اختيارك.",
    },
    image: fettuccineCrepe,
    groups: [...addOns],
  },
  {
    id: "fruity-crepe",
    category: "crepes",
    price: 850,
    name: { en: "Fruit Crêpe", ar: "كريب بالفواكه" },
    description: {
      en: "Crêpe topped with banana, kiwi and strawberries, served with your choice of chocolate.",
      ar: "كريب مغطّى بالموز، الكيوي والفريز، مع الشوكولا اللي بتختارها.",
    },
    image: fruityCrepe,
    groups: [...addOns],
  },
  {
    id: "brownie-crepe-sandwich",
    category: "crepes",
    price: 1000,
    name: { en: "Brownie Crêpe Sandwich", ar: "ساندويش كريب براوني" },
    description: {
      en: "Crêpe filled with brownies, strawberries, banana and crème pâtissière, topped with your favorite chocolate toppings.",
      ar: "كريب محشي براوني، فريز، موز وكريما باتيسيير، مع الشوكولا اللي بتختارها.",
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
      en: "Eight sushi-style crêpe rolls filled with brownies, topped with fruit and served with a Belgian chocolate dip.",
      ar: "8 رولز كريب على شكل سوشي، محشية براوني ومغطّاة بالفواكه، مع شوكولا بلجيكية للتغميس.",
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
      en: "Crêpe filled with pistachio cream and basma osmalliye, topped with Belgian chocolate and pistachios, and served with a scoop of ice cream of your choice.",
      ar: "كريب محشي كريمة فستق حلبي وبصمة عثملية، ومغطّى بالشوكولا البلجيكية وحبات الفستق الحلبي، مع سكوب آيس كريم من اختيارك.",
    },
    image: dubaiCrepe,
    groups: [...addOns],
  },
  {
    id: "waffle-stick",
    category: "waffles",
    price: 450,
    name: { en: "Waffle Stick", ar: "وافل ستيك" },
    description: {
      en: "One waffle stick covered with your choice of spread.",
      ar: "وافل ستيك مع الشوكولا اللي بتختارها.",
    },
    image: waffleStick,
    groups: ["stick", ...addOns],
  },
  {
    id: "premium-waffle-stick",
    category: "waffles",
    price: 600,
    name: { en: "Premium Waffle Stick", ar: "وافل ستيك بريميوم" },
    description: {
      en: "One waffle stick covered with your choice of Belgian milk or Belgian dark chocolate.",
      ar: "وافل ستيك مع اختيارك من الشوكولا البلجيكية بالحليب أو الشوكولا البلجيكية الداكنة.",
    },
    image: premiumWaffleStick,
    groups: ["stick-premium", ...addOns],
  },
  {
    id: "lotus-waffle",
    category: "waffles",
    price: 700,
    name: { en: "Lotus Waffle", ar: "وافل لوتس" },
    description: {
      en: "Waffle topped with Lotus spread and Lotus biscuits.",
      ar: "وافل مع كريمة لوتس وبسكويت لوتس.",
    },
    image: lotusWaffle,
    groups: [...addOns],
  },
  {
    id: "nutella-waffle",
    category: "waffles",
    price: 700,
    name: { en: "Nutella Waffle", ar: "وافل نوتيلا" },
    description: { en: "Waffle topped with Nutella spread.", ar: "وافل مع نوتيلا." },
    image: nutellaWaffle,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-waffle",
    category: "waffles",
    price: 700,
    name: { en: "White Chocolate Waffle", ar: "وافل بالشوكولاتة البيضاء" },
    description: { en: "Waffle topped with white chocolate.", ar: "وافل مع شوكولا بيضا." },
    image: whiteChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-waffle",
    category: "waffles",
    price: 1000,
    name: { en: "Belgian Chocolate Waffle", ar: "وافل بالشوكولاتة البلجيكية" },
    description: { en: "Waffle topped with Belgian chocolate.", ar: "وافل مع شوكولا بلجيكية." },
    image: belgianChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-waffle",
    category: "waffles",
    price: 1000,
    name: { en: "Dark Chocolate Waffle", ar: "وافل بالشوكولاتة الداكنة" },
    description: { en: "Waffle topped with dark chocolate.", ar: "وافل مع شوكولا داكنة." },
    image: darkChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "lotus-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "Lotus Pancakes", ar: "بان كيك لوتس" },
    description: {
      en: "Pancakes filled with Lotus spread and topped with a mix of chocolates.",
      ar: "بان كيك محشي كريمة لوتس ومغطّى بميكس من الشوكولا.",
    },
    image: lotusPancakes,
    groups: [...addOns],
  },
  {
    id: "nutella-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "Nutella Pancakes", ar: "بان كيك نوتيلا" },
    description: {
      en: "Pancakes filled with Nutella and topped with a mix of chocolates.",
      ar: "بان كيك محشي نوتيلا ومغطّى بميكس من الشوكولا.",
    },
    image: nutellaPancakes,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "White Chocolate Pancakes", ar: "بان كيك بالشوكولاتة البيضاء" },
    description: {
      en: "Pancakes filled with white chocolate and topped with a mix of chocolates.",
      ar: "بان كيك محشي شوكولا بيضا ومغطّى بميكس من الشوكولا.",
    },
    image: whiteChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-pancakes",
    category: "pancakes",
    price: 1000,
    name: { en: "Belgian Chocolate Pancakes", ar: "بان كيك بالشوكولاتة البلجيكية" },
    description: {
      en: "Pancakes filled with Belgian chocolate and topped with a mix of Belgian chocolates.",
      ar: "بان كيك محشي شوكولا بلجيكية ومغطّى بميكس من الشوكولا البلجيكية.",
    },
    image: belgianChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-pancakes",
    category: "pancakes",
    price: 1000,
    name: { en: "Dark Chocolate Pancakes", ar: "بان كيك بالشوكولاتة الداكنة" },
    description: {
      en: "Pancakes filled with dark chocolate and topped with a mix of chocolates.",
      ar: "بان كيك محشي شوكولا داكنة ومغطّى بميكس من الشوكولا.",
    },
    image: darkChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "creamy-profiteroles",
    category: "profiteroles",
    price: 1000,
    name: { en: "Profiteroles", ar: "بروفيترول" },
    description: {
      en: "Five profiteroles filled with your choice of crème pâtissière or ice cream, topped with your choice of topping.",
      ar: "5 حبات بروفيترول، محشية كريما باتيسيير أو آيس كريم حسب اختيارك، مع الشوكولا اللي بتحبها.",
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
      en: "Five profiteroles filled with vanilla ice cream and topped with your choice of sauce.",
      ar: "خمس قطع بروفيترول محشوة بآيس كريم الفانيليا ومغطاة بصلصة من اختيارك.",
    },
    image: iceCreamProfiteroles,
    groups: ["chocolate", ...addOns],
  },
  {
    id: "fruity-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Ice Cream Rolls (One Flavor)", ar: "آيس كريم رولز بنكهة واحدة" },
    description: {
      en: "Freshly prepared ice cream rolls with one flavor of your choice.",
      ar: "آيس كريم رولز بنكهة من اختيارك.",
    },
    image: fruityIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "lotus-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Ice Cream Rolls (Two Flavors)", ar: "آيس كريم رولز بنكهتين" },
    description: {
      en: "Freshly prepared ice cream rolls with two flavors of your choice.",
      ar: "آيس كريم رولز بنكهتين من اختيارك.",
    },
    image: lotusIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "nutella-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Ice Cream Rolls (Three Flavors)", ar: "آيس كريم رولز بثلاث نكهات" },
    description: {
      en: "Freshly prepared ice cream rolls with three flavors of your choice.",
      ar: "آيس كريم رولز بثلاث نكهات من اختيارك.",
    },
    image: nutellaIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "pistachio-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Pistachio Ice Cream Rolls", ar: "آيس كريم رولز بالفستق الحلبي" },
    description: {
      en: "Freshly prepared ice cream rolls with pistachio.",
      ar: "آيس كريم رولز بالفستق الحلبي.",
    },
    image: pistachioIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "bueno-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Bueno Bowl", ar: "بول بوينو" },
    description: { en: "TBD", ar: "TBD" },
    groups: [],
  },
  {
    id: "crunchy-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Crunchy Bowl", ar: "بول كرانشي" },
    description: { en: "TBD", ar: "TBD" },
    image: crunchyBowl,
    groups: [],
  },
  {
    id: "dubai-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Dubai Bowl", ar: "بول دبي" },
    description: { en: "TBD", ar: "TBD" },
    groups: [],
  },
  {
    id: "fruity-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Fruit Bowl", ar: "بول فواكه" },
    description: { en: "TBD", ar: "TBD" },
    image: fruityBowl,
    groups: [],
  },
  {
    id: "marshmallow-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Marshmallow Bowl", ar: "بول مارشميلو" },
    description: { en: "TBD", ar: "TBD" },
    groups: [],
  },
  {
    id: "strawberry-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Strawberry Bowl", ar: "بول فريز" },
    description: { en: "TBD", ar: "TBD" },
    image: strawberryBowl,
    groups: [],
  },
  {
    id: "san-sebastian-cheesecake",
    category: "bowls",
    price: 700,
    name: { en: "San Sebastián Cheesecake", ar: "تشيز كيك سان سيباستيان" },
    description: {
      en: "Creamy Basque cheesecake with a caramelized top.",
      ar: "تشيز كيك طري من جوّا ومحمّر من فوق.",
    },
    image: sanSebastianCheesecake,
    groups: [],
  },
  {
    id: "strawberry-box",
    category: "boxes",
    price: 1100,
    name: { en: "Strawberry Box", ar: "علبة فريز" },
    description: {
      en: "Fresh strawberries covered in chocolate.",
      ar: "فريز طازة مغطّى بالشوكولا.",
    },
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
      ar: "كريب فستق، كريب فيتوتشيني وكريب لوتس بعلبة وحدة.",
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
      en: "Waffle bites, crêpe rolls, fettuccine crêpe, brownies, pancakes, strawberries and profiteroles, served with four cups of chocolate for dipping.",
      ar: "قطع وافل، كريب رولز، كريب فيتوتشيني، براوني، بان كيك، فريز وبروفيترول، مع 4 كوب شوكولا للتغميس.",
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
    description: { en: "A smooth, cold caramel milkshake.", ar: "ميلك شيك كراميل بارد وناعم." },
    image: caramelMilkshake,
    groups: [],
  },
  {
    id: "chocolate-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Chocolate Milkshake", ar: "ميلك شيك شوكولا" },
    description: { en: "A thick, creamy chocolate milkshake.", ar: "ميلك شيك شوكولا كثيف وكريمي." },
    image: chocolateMilkshake,
    groups: [],
  },
  {
    id: "lotus-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Lotus Milkshake", ar: "ميلك شيك لوتس" },
    description: {
      en: "A thick, creamy milkshake made with Lotus Biscoff.",
      ar: "ميلك شيك كثيف وكريمي، معمول بلوتس بيسكوف.",
    },
    image: lotusMilkshake,
    groups: [],
  },
  {
    id: "oreo-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Oreo Milkshake", ar: "ميلك شيك أوريو" },
    description: {
      en: "A creamy milkshake with Oreo cookies.",
      ar: "ميلك شيك كريمي مع بسكويت أوريو.",
    },
    image: oreoMilkshake,
    groups: [],
  },
  {
    id: "strawberry-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Strawberry Milkshake", ar: "ميلك شيك فريز" },
    description: { en: "A thick, cold strawberry milkshake.", ar: "ميلك شيك فريز بارد وكثيف." },
    image: strawberryMilkshake,
    groups: [],
  },
  {
    id: "berry-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Berry Smoothie", ar: "سموذي توت" },
    description: { en: "A cold smoothie with mixed berries.", ar: "سموذي بارد مع توت مشكّل." },
    image: berrySmoothie,
    groups: [],
  },
  {
    id: "coconut-mango-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Mango & Coconut Smoothie", ar: "سموذي مانغو وجوز الهند" },
    description: {
      en: "A cold smoothie with mango and coconut.",
      ar: "سموذي بارد بالمانغو وجوز الهند.",
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
    description: {
      en: "Ripe mango blended into a smooth, cold drink.",
      ar: "سموذي بارد وناعم من المانغو الناضجة.",
    },
    image: mangoSmoothie,
    groups: [],
  },
  {
    id: "strawberry-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Strawberry Smoothie", ar: "سموذي فريز" },
    description: {
      en: "Fresh strawberries blended into a cold smoothie.",
      ar: "سموذي بارد من الفريز الطازة.",
    },
    image: strawberrySmoothie,
    groups: [],
  },
  {
    id: "blue-hawaii",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Blue Hawaii", ar: "بلو هاواي" },
    description: { en: "A cold tropical-style mixed drink.", ar: "بارد ومنعش." },
    image: blueHawaii,
    groups: [],
  },
  {
    id: "blue-ocean",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Blue Ocean", ar: "بلو أوشن" },
    description: { en: "A refreshing blue mixed drink, served cold.", ar: "بارد ومنعش." },
    image: blueOcean,
    groups: [],
  },
  {
    id: "hyper-kiwi",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Hyper Kiwi", ar: "هايبر كيوي" },
    description: { en: "A cold kiwi-flavored mixed drink.", ar: "بارد ومنعش." },
    image: hyperKiwi,
    groups: [],
  },
  {
    id: "mangotic",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Mangotic", ar: "مانغوتيك" },
    description: { en: "A cold mango-flavored mixed drink.", ar: "بارد ومنعش." },
    image: mangotic,
    groups: [],
  },
  {
    id: "passion-mojito",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Passion Fruit Mojito", ar: "موهيتو باشن فروت" },
    description: { en: "A cold mojito-style drink with passion fruit flavor.", ar: "بارد ومنعش." },
    image: passionMojito,
    groups: [],
  },
  {
    id: "strawberry-mojito",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Strawberry Mojito", ar: "موهيتو فريز" },
    description: { en: "A cold mojito-style drink with strawberry flavor.", ar: "بارد ومنعش." },
    image: strawberryMojito,
    groups: [],
  },
  {
    id: "orange-juice",
    category: "drinks",
    subcategory: "juice",
    price: 222,
    name: { en: "Fresh Orange Juice", ar: "عصير برتقال طازة" },
    description: { en: "Freshly squeezed orange juice.", ar: "عصير برتقال معصور طازة." },
    image: orangeJuice,
    groups: [],
  },
  {
    id: "water",
    category: "drinks",
    subcategory: "water",
    price: 100,
    name: { en: "Water", ar: "مياه" },
    description: { en: "Bottled water.", ar: "قنينة مياه." },
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
export const lowestPrice = (menu: Menu, category: CategoryId) =>
  Math.min(...menu.items.filter((i) => i.category === category).map((i) => i.price));
