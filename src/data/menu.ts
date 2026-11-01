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
      ar: "كريب رقيق مع الشوكولاتة أو كريمات الدهن أو الفواكه.",
    },
    image: nutellaCrepe,
  },
  {
    id: "waffles",
    name: { en: "Waffles", ar: "وافل" },
    description: {
      en: "Crisp on the outside, soft on the inside.",
      ar: "وافل مقرمش من الخارج وطري من الداخل.",
    },
    image: lotusWaffle,
  },
  {
    id: "pancakes",
    name: { en: "Pancakes", ar: "بان كيك" },
    description: {
      en: "Fluffy pancakes with chocolate or Lotus spread.",
      ar: "بان كيك هش مع الشوكولاتة أو كريمة لوتس.",
    },
    image: nutellaPancakes,
  },
  {
    id: "profiteroles",
    name: { en: "Profiteroles", ar: "بروفيترول" },
    description: {
      en: "Pastry puffs filled with cream or ice cream, with your choice of sauce.",
      ar: "قطع بروفيترول محشوة بالكريمة أو الآيس كريم، مع صلصة من اختيارك.",
    },
    image: creamyProfiteroles,
  },
  {
    id: "rolls",
    name: { en: "Ice cream rolls", ar: "لفائف الآيس كريم" },
    description: {
      en: "Freshly prepared ice cream rolls in a variety of flavors.",
      ar: "لفائف آيس كريم تحضر طازجة بنكهات متنوعة.",
    },
    image: pistachioIceCreamRolls,
  },
  {
    id: "bowls",
    name: { en: "Dessert bowls & cheesecake", ar: "أطباق الحلوى والتشيز كيك" },
    description: {
      en: "Dessert bowls with a variety of toppings, plus San Sebastián cheesecake.",
      ar: "أطباق حلوى بإضافات متنوعة، وتشيز كيك سان سيباستيان.",
    },
    image: strawberryBowl,
  },
  {
    id: "boxes",
    name: { en: "Dessert boxes", ar: "علب الحلوى" },
    description: {
      en: "A selection of dessert boxes to share.",
      ar: "تشكيلة من علب الحلوى للمشاركة.",
    },
    image: sweetSpotBox,
  },
  {
    id: "drinks",
    name: { en: "Cold drinks", ar: "مشروبات باردة" },
    description: {
      en: "Milkshakes, smoothies, mixed drinks, fresh juice and water.",
      ar: "ميلك شيك وسموذي ومشروبات مشكلة وعصير طازج ومياه.",
    },
    image: strawberryMilkshake,
    subcategories: [
      { id: "milkshakes", name: { en: "Milkshakes", ar: "ميلك شيك" } },
      { id: "smoothies", name: { en: "Smoothies", ar: "سموذي" } },
      { id: "mixes", name: { en: "Mixed drinks", ar: "مشروبات مشكلة" } },
      { id: "juice", name: { en: "Fresh juice", ar: "عصير طازج" } },
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
    name: { en: "Sauce", ar: "الصلصة" },
    min: 1,
    max: 1,
    options: [
      option("belgian", "Belgian chocolate", "شوكولاتة بلجيكية"),
      option("dark", "Dark chocolate", "شوكولاتة داكنة"),
      option("lotus", "Lotus spread", "كريمة لوتس"),
      option("nutella", "Nutella", "نوتيلا"),
      option("white", "White chocolate", "شوكولاتة بيضاء"),
    ],
  },
  // Required: the dessert comes with one of these.
  stick: {
    id: "stick",
    name: { en: "Coating", ar: "التغطية" },
    min: 1,
    max: 1,
    options: [
      option("lotus", "Lotus spread", "كريمة لوتس"),
      option("nutella", "Nutella", "نوتيلا"),
      option("white", "White chocolate", "شوكولاتة بيضاء"),
    ],
  },
  // Required: the dessert comes with one of these.
  "stick-premium": {
    id: "stick-premium",
    name: { en: "Coating", ar: "التغطية" },
    min: 1,
    max: 1,
    options: [
      option("belgian", "Belgian chocolate", "شوكولاتة بلجيكية"),
      option("dark", "Dark chocolate", "شوكولاتة داكنة"),
    ],
  },
  "extra-chocolate": {
    id: "extra-chocolate",
    name: { en: "Extra sauce", ar: "صلصة إضافية" },
    min: 0,
    max: 5,
    options: [
      option("belgian", "Belgian chocolate", "شوكولاتة بلجيكية", 300),
      option("dark", "Dark chocolate", "شوكولاتة داكنة", 300),
      option("lotus", "Lotus spread", "كريمة لوتس", 300),
      option("nutella", "Nutella", "نوتيلا", 300),
      option("white", "White chocolate", "شوكولاتة بيضاء", 300),
    ],
  },
  fruit: {
    id: "fruit",
    name: { en: "Fresh fruit", ar: "فواكه طازجة" },
    min: 0,
    max: 5,
    options: [
      option("banana", "Banana", "موز", 150),
      option("kiwi", "Kiwi", "كيوي", 150),
      option("pineapple", "Pineapple", "أناناس", 150),
      option("mixed", "Mixed fruit", "فواكه مشكلة", 200),
      option("strawberry", "Strawberries", "فراولة", 200),
    ],
  },
  toppings: {
    id: "toppings",
    name: { en: "Toppings", ar: "الإضافات" },
    min: 0,
    max: 8,
    options: [
      option("rice-chocolate", "Chocolate rice crispies", "أرز مقرمش بالشوكولاتة", 50),
      option("vermicelli", "Chocolate vermicelli", "حبيبات شوكولاتة للتزيين", 50),
      option("crispy-balls", "Crispy balls", "كرات مقرمشة", 50),
      option("crispy-flakes", "Crispy flakes", "رقائق مقرمشة", 50),
      option("marshmallow", "Marshmallows", "مارشميلو", 50),
      option("smarties", "Smarties", "سمارتيز", 50),
      option("sprinkles", "Sprinkles", "حبيبات سكر للتزيين", 50),
      option("rice-vanilla", "Vanilla rice crispies", "أرز مقرمش بالفانيليا", 50),
    ],
  },
  bars: {
    id: "bars",
    name: { en: "Chocolate, cookies & brownies", ar: "شوكولاتة وبسكويت وبراوني" },
    min: 0,
    max: 5,
    options: [
      option("brownie", "Brownie", "براوني", 150),
      option("kinder", "Kinder", "كيندر", 150),
      option("kinder-bueno", "Kinder Bueno", "كيندر بوينو", 150),
      option("kinder-bueno-white", "Kinder Bueno White", "كيندر بوينو بالشوكولاتة البيضاء", 150),
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
      en: "Crêpe filled with Lotus spread and topped with Lotus biscuits.",
      ar: "كريب محشو بكريمة لوتس ومزين ببسكويت لوتس.",
    },
    image: lotusCrepe,
    groups: [...addOns],
  },
  {
    id: "nutella-crepe",
    category: "crepes",
    price: 500,
    name: { en: "Nutella Crêpe", ar: "كريب نوتيلا" },
    description: { en: "Crêpe filled with Nutella spread.", ar: "كريب محشو بكريمة نوتيلا." },
    image: nutellaCrepe,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-crepe",
    category: "crepes",
    price: 500,
    name: { en: "White Chocolate Crêpe", ar: "كريب بالشوكولاتة البيضاء" },
    description: { en: "Crêpe filled with white chocolate.", ar: "كريب محشو بالشوكولاتة البيضاء." },
    image: whiteChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-crepe",
    category: "crepes",
    price: 750,
    name: { en: "Belgian Chocolate Crêpe", ar: "كريب بالشوكولاتة البلجيكية" },
    description: {
      en: "Crêpe topped with Belgian chocolate.",
      ar: "كريب مغطى بالشوكولاتة البلجيكية.",
    },
    image: belgianChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-crepe",
    category: "crepes",
    price: 750,
    name: { en: "Dark Chocolate Crêpe", ar: "كريب بالشوكولاتة الداكنة" },
    description: { en: "Crêpe topped with dark chocolate.", ar: "كريب مغطى بالشوكولاتة الداكنة." },
    image: darkChocolateCrepe,
    groups: [...addOns],
  },
  {
    id: "fettuccine-crepe",
    category: "crepes",
    price: 800,
    name: { en: "Fettuccine Crêpe", ar: "كريب فيتوتشيني" },
    description: {
      en: "Crêpe ribbons served with a scoop of ice cream and Belgian chocolate for dipping.",
      ar: "شرائط كريب تقدم مع كرة من الآيس كريم وصلصة شوكولاتة بلجيكية للتغميس.",
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
      en: "Crêpe topped with mixed fresh fruit and served with Belgian chocolate.",
      ar: "كريب مزين بفواكه طازجة مشكلة، يقدم مع الشوكولاتة البلجيكية.",
    },
    image: fruityCrepe,
    groups: [...addOns],
  },
  {
    id: "brownie-crepe-sandwich",
    category: "crepes",
    price: 1000,
    name: { en: "Brownie Crêpe Sandwich", ar: "ساندويتش كريب بالبراوني" },
    description: {
      en: "Crêpe filled with brownies, strawberries, banana, pastry cream and white chocolate, with a chocolate topping.",
      ar: "كريب محشو بالبراوني والفراولة والموز وكريمة الحلواني والشوكولاتة البيضاء، مع تغطية من الشوكولاتة.",
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
      en: "Eight sushi-style crêpe rolls filled with brownies, topped with fruit and served with Belgian chocolate for dipping.",
      ar: "ثماني لفائف كريب على طريقة السوشي، محشوة بالبراوني ومزينة بالفواكه، تقدم مع صلصة شوكولاتة بلجيكية للتغميس.",
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
      en: "Crêpe filled with pistachio cream and crispy kunafa, topped with Belgian chocolate and served with vanilla ice cream.",
      ar: "كريب محشو بكريمة الفستق الحلبي والكنافة المقرمشة، مغطى بالشوكولاتة البلجيكية ويقدم مع آيس كريم الفانيليا.",
    },
    image: dubaiCrepe,
    groups: [...addOns],
  },
  {
    id: "waffle-stick",
    category: "waffles",
    price: 450,
    name: { en: "Waffle Stick", ar: "وافل على عود" },
    description: {
      en: "One waffle stick coated in your choice of Lotus spread, Nutella or white chocolate.",
      ar: "قطعة وافل على عود، مغطاة بكريمة لوتس أو نوتيلا أو الشوكولاتة البيضاء، حسب اختيارك.",
    },
    image: waffleStick,
    groups: ["stick", ...addOns],
  },
  {
    id: "premium-waffle-stick",
    category: "waffles",
    price: 600,
    name: { en: "Premium Waffle Stick", ar: "وافل فاخر على عود" },
    description: {
      en: "One waffle stick coated in your choice of Belgian or dark chocolate.",
      ar: "قطعة وافل على عود، مغطاة بالشوكولاتة البلجيكية أو الداكنة، حسب اختيارك.",
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
      ar: "وافل مغطى بكريمة لوتس ومزين ببسكويت لوتس.",
    },
    image: lotusWaffle,
    groups: [...addOns],
  },
  {
    id: "nutella-waffle",
    category: "waffles",
    price: 700,
    name: { en: "Nutella Waffle", ar: "وافل نوتيلا" },
    description: { en: "Waffle topped with Nutella spread.", ar: "وافل مغطى بكريمة نوتيلا." },
    image: nutellaWaffle,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-waffle",
    category: "waffles",
    price: 700,
    name: { en: "White Chocolate Waffle", ar: "وافل بالشوكولاتة البيضاء" },
    description: {
      en: "Waffle topped with white chocolate.",
      ar: "وافل مغطى بالشوكولاتة البيضاء.",
    },
    image: whiteChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "belgian-chocolate-waffle",
    category: "waffles",
    price: 1000,
    name: { en: "Belgian Chocolate Waffle", ar: "وافل بالشوكولاتة البلجيكية" },
    description: {
      en: "Waffle topped with Belgian chocolate.",
      ar: "وافل مغطى بالشوكولاتة البلجيكية.",
    },
    image: belgianChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "dark-chocolate-waffle",
    category: "waffles",
    price: 1000,
    name: { en: "Dark Chocolate Waffle", ar: "وافل بالشوكولاتة الداكنة" },
    description: { en: "Waffle topped with dark chocolate.", ar: "وافل مغطى بالشوكولاتة الداكنة." },
    image: darkChocolateWaffle,
    groups: [...addOns],
  },
  {
    id: "lotus-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "Lotus Pancakes", ar: "بان كيك لوتس" },
    description: {
      en: "Pancakes topped with Lotus spread and Lotus biscuits.",
      ar: "بان كيك مغطى بكريمة لوتس ومزين ببسكويت لوتس.",
    },
    image: lotusPancakes,
    groups: [...addOns],
  },
  {
    id: "nutella-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "Nutella Pancakes", ar: "بان كيك نوتيلا" },
    description: { en: "Pancakes topped with Nutella spread.", ar: "بان كيك مغطى بكريمة نوتيلا." },
    image: nutellaPancakes,
    groups: [...addOns],
  },
  {
    id: "white-chocolate-pancakes",
    category: "pancakes",
    price: 700,
    name: { en: "White Chocolate Pancakes", ar: "بان كيك بالشوكولاتة البيضاء" },
    description: {
      en: "Pancakes topped with white chocolate.",
      ar: "بان كيك مغطى بالشوكولاتة البيضاء.",
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
      en: "Pancakes topped with Belgian chocolate.",
      ar: "بان كيك مغطى بالشوكولاتة البلجيكية.",
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
      en: "Pancakes topped with dark chocolate.",
      ar: "بان كيك مغطى بالشوكولاتة الداكنة.",
    },
    image: darkChocolatePancakes,
    groups: [...addOns],
  },
  {
    id: "creamy-profiteroles",
    category: "profiteroles",
    price: 1000,
    name: { en: "Cream-Filled Profiteroles", ar: "بروفيترول بالكريمة" },
    description: {
      en: "Five profiteroles filled with pastry cream, served with strawberries and your choice of sauce.",
      ar: "خمس قطع بروفيترول محشوة بكريمة الحلواني، تقدم مع الفراولة وصلصة من اختيارك.",
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
    name: { en: "Ice Cream Rolls (One Flavor)", ar: "لفائف آيس كريم بنكهة واحدة" },
    description: {
      en: "Freshly prepared ice cream rolls with one flavor of your choice.",
      ar: "لفائف آيس كريم تحضر طازجة بنكهة واحدة من اختيارك.",
    },
    image: fruityIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "lotus-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Ice Cream Rolls (Two Flavors)", ar: "لفائف آيس كريم بنكهتين" },
    description: {
      en: "Freshly prepared ice cream rolls combining two flavors of your choice.",
      ar: "لفائف آيس كريم تحضر طازجة وتجمع نكهتين من اختيارك.",
    },
    image: lotusIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "nutella-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Ice Cream Rolls (Three Flavors)", ar: "لفائف آيس كريم بثلاث نكهات" },
    description: {
      en: "Freshly prepared ice cream rolls combining three flavors of your choice.",
      ar: "لفائف آيس كريم تحضر طازجة وتجمع ثلاث نكهات من اختيارك.",
    },
    image: nutellaIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "pistachio-ice-cream-rolls",
    category: "rolls",
    price: 400,
    name: { en: "Pistachio Ice Cream Rolls", ar: "لفائف آيس كريم بالفستق الحلبي" },
    description: {
      en: "Freshly prepared ice cream rolls with pistachio.",
      ar: "لفائف آيس كريم بالفستق الحلبي تحضر طازجة.",
    },
    image: pistachioIceCreamRolls,
    groups: [...addOns],
  },
  {
    id: "bueno-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Bueno Bowl", ar: "طبق بوينو" },
    description: { en: "A dessert bowl with Kinder Bueno.", ar: "طبق حلوى مع كيندر بوينو." },
    groups: [],
  },
  {
    id: "crunchy-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Crunchy Bowl", ar: "طبق الحلوى المقرمش" },
    description: {
      en: "A dessert bowl with chocolate, strawberries and a crunchy finish.",
      ar: "طبق حلوى بالشوكولاتة والفراولة مع لمسة مقرمشة.",
    },
    image: crunchyBowl,
    groups: [],
  },
  {
    id: "dubai-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Dubai Bowl", ar: "طبق دبي" },
    description: {
      en: "A Dubai-style dessert bowl with pistachio and kunafa.",
      ar: "طبق حلوى على طريقة دبي بالفستق الحلبي والكنافة.",
    },
    groups: [],
  },
  {
    id: "fruity-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Fruit Bowl", ar: "طبق الفواكه" },
    description: {
      en: "A dessert bowl with mixed fresh fruit.",
      ar: "طبق حلوى مع فواكه طازجة مشكلة.",
    },
    image: fruityBowl,
    groups: [],
  },
  {
    id: "marshmallow-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Marshmallow Bowl", ar: "طبق المارشميلو" },
    description: { en: "A dessert bowl with marshmallows.", ar: "طبق حلوى مع المارشميلو." },
    groups: [],
  },
  {
    id: "strawberry-bowl",
    category: "bowls",
    price: 600,
    name: { en: "Strawberry Bowl", ar: "طبق الفراولة" },
    description: { en: "A dessert bowl with fresh strawberries.", ar: "طبق حلوى مع فراولة طازجة." },
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
      ar: "تشيز كيك باسكي بقوام كريمي وسطح مكرمل.",
    },
    image: sanSebastianCheesecake,
    groups: [],
  },
  {
    id: "strawberry-box",
    category: "boxes",
    price: 1100,
    name: { en: "Strawberry Box", ar: "علبة الفراولة" },
    description: {
      en: "Fresh strawberries served with chocolate.",
      ar: "فراولة طازجة تقدم مع الشوكولاتة.",
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
      ar: "كريب بالفستق الحلبي وكريب فيتوتشيني وكريب لوتس في علبة واحدة.",
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
      en: "Waffle bites, crêpe rolls, pancakes, brownies, profiteroles and strawberries, served with four dipping sauces.",
      ar: "قطع وافل ولفائف كريب وبان كيك وبراوني وبروفيترول وفراولة، تقدم مع أربع صلصات للتغميس.",
    },
    image: sweetSpotBox,
    groups: [],
  },
  {
    id: "caramel-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Caramel Milkshake", ar: "ميلك شيك بالكراميل" },
    description: {
      en: "A smooth, chilled caramel milkshake.",
      ar: "ميلك شيك بارد بالكراميل وقوام ناعم.",
    },
    image: caramelMilkshake,
    groups: [],
  },
  {
    id: "chocolate-milkshake",
    category: "drinks",
    subcategory: "milkshakes",
    price: 500,
    name: { en: "Chocolate Milkshake", ar: "ميلك شيك بالشوكولاتة" },
    description: {
      en: "A thick chocolate milkshake with a rich flavor.",
      ar: "ميلك شيك كثيف بالشوكولاتة ونكهة غنية.",
    },
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
      en: "A thick milkshake with Lotus Biscoff flavor.",
      ar: "ميلك شيك كثيف بنكهة لوتس بيسكوف.",
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
    name: { en: "Strawberry Milkshake", ar: "ميلك شيك بالفراولة" },
    description: {
      en: "A thick, chilled strawberry milkshake.",
      ar: "ميلك شيك بارد وكثيف بالفراولة.",
    },
    image: strawberryMilkshake,
    groups: [],
  },
  {
    id: "berry-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Berry Smoothie", ar: "سموذي بالتوت" },
    description: { en: "A chilled smoothie with mixed berries.", ar: "سموذي بارد بالتوت المشكل." },
    image: berrySmoothie,
    groups: [],
  },
  {
    id: "coconut-mango-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Mango & Coconut Smoothie", ar: "سموذي بالمانجو وجوز الهند" },
    description: {
      en: "A chilled smoothie with mango and coconut.",
      ar: "سموذي بارد بالمانجو وجوز الهند.",
    },
    image: coconutMangoSmoothie,
    groups: [],
  },
  {
    id: "mango-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Mango Smoothie", ar: "سموذي بالمانجو" },
    description: {
      en: "Ripe mango blended into a smooth, chilled drink.",
      ar: "مانجو ناضجة تمزج لتحضير مشروب بارد بقوام ناعم.",
    },
    image: mangoSmoothie,
    groups: [],
  },
  {
    id: "strawberry-smoothie",
    category: "drinks",
    subcategory: "smoothies",
    price: 400,
    name: { en: "Strawberry Smoothie", ar: "سموذي بالفراولة" },
    description: {
      en: "Fresh strawberries blended into a chilled smoothie.",
      ar: "سموذي بارد محضر من الفراولة الطازجة.",
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
    description: {
      en: "A chilled tropical-style mixed drink.",
      ar: "مشروب بارد مشكل بطابع استوائي.",
    },
    image: blueHawaii,
    groups: [],
  },
  {
    id: "blue-ocean",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Blue Ocean", ar: "بلو أوشن" },
    description: {
      en: "A refreshing blue mixed drink, served chilled.",
      ar: "مشروب أزرق مشكل ومنعش، يقدم باردا.",
    },
    image: blueOcean,
    groups: [],
  },
  {
    id: "hyper-kiwi",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Hyper Kiwi", ar: "هايبر كيوي" },
    description: {
      en: "A chilled kiwi-flavored mixed drink.",
      ar: "مشروب بارد مشكل بنكهة الكيوي.",
    },
    image: hyperKiwi,
    groups: [],
  },
  {
    id: "mangotic",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Mangotic", ar: "مانغوتيك" },
    description: {
      en: "A chilled mango-flavored mixed drink.",
      ar: "مشروب بارد مشكل بنكهة المانجو.",
    },
    image: mangotic,
    groups: [],
  },
  {
    id: "passion-mojito",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Passion Fruit Mojito", ar: "موهيتو باشن فروت" },
    description: {
      en: "A chilled mojito-style drink with passion fruit flavor.",
      ar: "مشروب بارد على طريقة الموهيتو بنكهة الباشن فروت.",
    },
    image: passionMojito,
    groups: [],
  },
  {
    id: "strawberry-mojito",
    category: "drinks",
    subcategory: "mixes",
    price: 333,
    name: { en: "Strawberry Mojito", ar: "موهيتو بالفراولة" },
    description: {
      en: "A chilled mojito-style drink with strawberry flavor.",
      ar: "مشروب بارد على طريقة الموهيتو بنكهة الفراولة.",
    },
    image: strawberryMojito,
    groups: [],
  },
  {
    id: "orange-juice",
    category: "drinks",
    subcategory: "juice",
    price: 222,
    name: { en: "Fresh Orange Juice", ar: "عصير برتقال طازج" },
    description: { en: "Freshly squeezed orange juice.", ar: "عصير برتقال معصور طازجا." },
    image: orangeJuice,
    groups: [],
  },
  {
    id: "water",
    category: "drinks",
    subcategory: "water",
    price: 100,
    name: { en: "Water", ar: "مياه" },
    description: { en: "Bottled water.", ar: "عبوة مياه." },
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
