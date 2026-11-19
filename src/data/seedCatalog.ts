import type { Category, Product } from '../types/store';

export const STORE_MEDIA = {
  heroStudio: '/src/assets/images/hero_architectural_studio_1795081927475.jpg',
  livingBanner: '/src/assets/images/banner_craftsmanship_living_1795081927803.jpg',
  deskLamp: '/src/assets/images/product_matte_desk_lamp_1795081927831.jpg',
  monolithSpeaker: '/src/assets/images/product_monolith_speaker_1795081927782.jpg',
  ceramicCarafe: '/src/assets/images/product_ceramic_carafe_1795081927825.jpg',
  loungeChair: '/src/assets/images/product_lounge_chair_1795081927629.jpg',
  analogClock: '/src/assets/images/product_analog_clock_1795081927933.jpg',
  pendantLight: '/src/assets/images/product_pendant_light_1795081927200.jpg',
  mechanicalKeyboard: '/src/assets/images/product_mechanical_keyboard_1795083564508.jpg',
  studioHeadphones: '/src/assets/images/product_studio_headphones_1795083563526.jpg',
  gooseneckKettle: '/src/assets/images/product_gooseneck_kettle_1795083563610.jpg',
  monitorStand: '/src/assets/images/product_monitor_stand_1795083564360.jpg',
  espressoMachine: '/src/assets/images/product_espresso_machine_1795083563727.jpg',
  weekenderBag: '/src/assets/images/product_weekender_bag_1795083563556.jpg',
} as const;

export const STUDIO_PRESET_IMAGES: Array<{ label: string; url: string }> = [
  { label: 'Articulated Desk Lamp', url: STORE_MEDIA.deskLamp },
  { label: 'Monolith Hi-Fi Speaker', url: STORE_MEDIA.monolithSpeaker },
  { label: 'Studio Wireless Headphones', url: STORE_MEDIA.studioHeadphones },
  { label: 'Aluminum Mechanical Keyboard', url: STORE_MEDIA.mechanicalKeyboard },
  { label: 'Smoked Oak Monitor Riser', url: STORE_MEDIA.monitorStand },
  { label: 'Stoneware Pour-Over Carafe', url: STORE_MEDIA.ceramicCarafe },
  { label: 'Gooseneck Electric Kettle', url: STORE_MEDIA.gooseneckKettle },
  { label: 'Architectural Espresso Machine', url: STORE_MEDIA.espressoMachine },
  { label: 'Smoked Oak Lounge Chair', url: STORE_MEDIA.loungeChair },
  { label: 'Brushed Steel Desk Clock', url: STORE_MEDIA.analogClock },
  { label: 'Spun Dome Pendant Lamp', url: STORE_MEDIA.pendantLight },
  { label: 'Canvas & Leather Weekender', url: STORE_MEDIA.weekenderBag },
];

export interface SeedCategoryInput {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
}

export interface SeedProductInput {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  categoryId: string;
  categoryName: string;
  imageUrl: string;
  featured: boolean;
  isNewArrival: boolean;
  sku: string;
  specs: string;
}

export const INITIAL_SEED_CATEGORIES: SeedCategoryInput[] = [
  {
    id: 'cat_lighting',
    name: 'Lighting',
    slug: 'lighting',
    description: 'Precision task lamps and spun aluminum pendants engineered for warm architectural illumination.',
    displayOrder: 1,
  },
  {
    id: 'cat_audio',
    name: 'Electronics & Audio',
    slug: 'electronics-audio',
    description: 'Acoustic speakers and reference wireless headphones milled from solid anodized aluminum.',
    displayOrder: 2,
  },
  {
    id: 'cat_workspace',
    name: 'Workspace & Desk',
    slug: 'workspace-desk',
    description: 'Tactile mechanical keyboards, smoked oak monitor risers, and precision desk hardware.',
    displayOrder: 3,
  },
  {
    id: 'cat_kitchen',
    name: 'Kitchen & Coffee',
    slug: 'kitchen-coffee',
    description: 'Architectural espresso systems, electric gooseneck kettles, and raw stoneware vessels.',
    displayOrder: 4,
  },
  {
    id: 'cat_furniture',
    name: 'Furniture & Living',
    slug: 'furniture-living',
    description: 'Low-profile timber and bouclé wool seating crafted for enduring structural balance.',
    displayOrder: 5,
  },
  {
    id: 'cat_objects',
    name: 'Carry & Objects',
    slug: 'carry-objects',
    description: 'Waxed canvas weekender bags and brushed steel timepieces built for daily travel and studio.',
    displayOrder: 6,
  },
];

export const INITIAL_SEED_PRODUCTS: SeedProductInput[] = [
  {
    id: 'prod_cantilever_lamp',
    name: 'No. 04 Articulated Task Lamp',
    slug: 'no-04-articulated-task-lamp',
    description:
      'Machined from extruded matte black aluminum with tensioned dual-axis joints and a high-CRI 2700K LED diffuser. Engineered to deliver glare-free studio illumination across drafting desks and reading tables.',
    price: 340,
    stock: 14,
    categoryId: 'cat_lighting',
    categoryName: 'Lighting',
    imageUrl: STORE_MEDIA.deskLamp,
    featured: true,
    isNewArrival: true,
    sku: 'KF-LGT-004',
    specs: 'Anodized Aluminum · 2700K 95+ CRI LED · Weighted Steel Base · 2.4m Braided Cord',
  },
  {
    id: 'prod_monolith_speaker',
    name: 'Monolith M1 Wireless Speaker',
    slug: 'monolith-m1-wireless-speaker',
    description:
      'Cylindrical omnidirectional speaker housed in a bead-blasted charcoal aluminum shell. Features dual neodymium woofers, 360-degree acoustic dispersion, and lossless Wi-Fi / Bluetooth 5.3 streaming.',
    price: 495,
    stock: 9,
    categoryId: 'cat_audio',
    categoryName: 'Electronics & Audio',
    imageUrl: STORE_MEDIA.monolithSpeaker,
    featured: true,
    isNewArrival: true,
    sku: 'KF-AUD-011',
    specs: 'CNC Aluminum Enclosure · 360° Acoustic Array · 18-Hour Battery · USB-C & AirPlay',
  },
  {
    id: 'prod_studio_headphones',
    name: 'Sonorus ANC Studio Headphones',
    slug: 'sonorus-anc-studio-headphones',
    description:
      'Reference-grade wireless over-ear headphones machined from matte anodized aluminum with lambskin memory-foam ear cushions, hybrid active noise cancellation, and 45-hour battery endurance.',
    price: 420,
    stock: 16,
    categoryId: 'cat_audio',
    categoryName: 'Electronics & Audio',
    imageUrl: STORE_MEDIA.studioHeadphones,
    featured: true,
    isNewArrival: true,
    sku: 'KF-AUD-028',
    specs: '40mm Beryllium Drivers · Hybrid ANC · Lambskin Ear Pads · USB-C Lossless DAC Mode',
  },
  {
    id: 'prod_mechanical_keyboard',
    name: 'K75 CNC Aluminum Mechanical Keyboard',
    slug: 'k75-cnc-aluminum-mechanical-keyboard',
    description:
      '75% gasket-mounted wireless mechanical keyboard carved from a solid block of bead-blasted dark aluminum. Includes hot-swappable tactile switches, double-shot PBT keycaps, and a knurled rotary encoder.',
    price: 265,
    stock: 21,
    categoryId: 'cat_workspace',
    categoryName: 'Workspace & Desk',
    imageUrl: STORE_MEDIA.mechanicalKeyboard,
    featured: true,
    isNewArrival: true,
    sku: 'KF-WRK-075',
    specs: 'CNC 6063 Aluminum · Tri-Mode 2.4GHz/BT/USB-C · Hot-Swap PCB · PBT Keycaps',
  },
  {
    id: 'prod_monitor_stand',
    name: 'Plinth Smoked Oak Monitor Shelf',
    slug: 'plinth-smoked-oak-monitor-shelf',
    description:
      'Solid kiln-dried smoked oak desk shelf supported on precision-bent charcoal steel legs. Elevates displays to ergonomic eye level while creating tucked storage beneath for keyboards and audio interfaces.',
    price: 195,
    stock: 15,
    categoryId: 'cat_workspace',
    categoryName: 'Workspace & Desk',
    imageUrl: STORE_MEDIA.monitorStand,
    featured: false,
    isNewArrival: true,
    sku: 'KF-WRK-031',
    specs: 'Solid Smoked White Oak · Powder-Coated Steel · 110cm W × 23cm D · 40kg Load Rating',
  },
  {
    id: 'prod_espresso_machine',
    name: 'Aeterna Dual-Thermoblock Espresso Machine',
    slug: 'aeterna-dual-thermoblock-espresso-machine',
    description:
      'Compact architectural espresso maker with brushed 304 stainless steel cladding, PID thermal stability, integrated pressure gauge, 58mm commercial walnut portafilter, and articulating steam wand.',
    price: 890,
    stock: 6,
    categoryId: 'cat_kitchen',
    categoryName: 'Kitchen & Coffee',
    imageUrl: STORE_MEDIA.espressoMachine,
    featured: true,
    isNewArrival: true,
    sku: 'KF-KIT-090',
    specs: '58mm Commercial Group · PID Temperature Control · 15-Bar Italian Pump · 2L Tank',
  },
  {
    id: 'prod_gooseneck_kettle',
    name: 'Kuro Variable-Temp Gooseneck Kettle',
    slug: 'kuro-variable-temp-gooseneck-kettle',
    description:
      '1200W precision pour-over electric kettle featuring degree-accurate PID heating, a counterbalanced walnut handle, and a matte obsidian stainless steel body with OLED base readout.',
    price: 175,
    stock: 22,
    categoryId: 'cat_kitchen',
    categoryName: 'Kitchen & Coffee',
    imageUrl: STORE_MEDIA.gooseneckKettle,
    featured: false,
    isNewArrival: true,
    sku: 'KF-KIT-019',
    specs: '900ml Capacity · 1200W Quick Heat · 40°C–100°C PID Hold · Solid Walnut Handle',
  },
  {
    id: 'prod_stoneware_carafe',
    name: 'Kuro Stoneware Pour-Over Set',
    slug: 'kuro-stoneware-pour-over-set',
    description:
      'Wheel-thrown raw black stoneware dripper, 600ml server carafe, and matching handleless tasting cup. High thermal mass retains extraction temperature without glazing defects.',
    price: 118,
    stock: 26,
    categoryId: 'cat_kitchen',
    categoryName: 'Kitchen & Coffee',
    imageUrl: STORE_MEDIA.ceramicCarafe,
    featured: false,
    isNewArrival: false,
    sku: 'KF-KIT-008',
    specs: 'High-Fire Black Stoneware · 600ml Capacity · Compatible with V60 #02 Filters',
  },
  {
    id: 'prod_lounge_chair',
    name: 'Soren Smoked Oak Lounge Chair',
    slug: 'soren-smoked-oak-lounge-chair',
    description:
      'Sculptural solid smoked oak frame paired with deep-cushion charcoal bouclé wool upholstery. Mortise-and-tenon joinery ensures heirloom rigidity while maintaining a light visual footprint.',
    price: 1280,
    stock: 5,
    categoryId: 'cat_furniture',
    categoryName: 'Furniture & Living',
    imageUrl: STORE_MEDIA.loungeChair,
    featured: true,
    isNewArrival: false,
    sku: 'KF-FRN-022',
    specs: 'FSC Smoked White Oak · 100% Virgin Wool Bouclé · 74cm W × 78cm D × 72cm H',
  },
  {
    id: 'prod_dome_pendant',
    name: 'Atelier 42 Spun Dome Pendant',
    slug: 'atelier-42-spun-dome-pendant',
    description:
      'Spun heavy-gauge aluminum shade finished in satin charcoal powder coat with knurled solid stainless socket hardware. Ideal suspended above dining tables and kitchen islands.',
    price: 290,
    stock: 11,
    categoryId: 'cat_lighting',
    categoryName: 'Lighting',
    imageUrl: STORE_MEDIA.pendantLight,
    featured: false,
    isNewArrival: false,
    sku: 'KF-LGT-042',
    specs: '42cm Diameter · Powder-Coated Aluminum · E26/E27 Porcelain Socket · 2.5m Drop Cord',
  },
  {
    id: 'prod_weekender_bag',
    name: 'Transit Waxed Canvas Weekender',
    slug: 'transit-waxed-canvas-weekender',
    description:
      '42-liter structured travel duffle constructed from water-repellent 18oz Scottish waxed charcoal canvas, vegetable-tanned full-grain bridle leather straps, and solid brass hardware.',
    price: 360,
    stock: 13,
    categoryId: 'cat_objects',
    categoryName: 'Carry & Objects',
    imageUrl: STORE_MEDIA.weekenderBag,
    featured: false,
    isNewArrival: true,
    sku: 'KF-CRY-042',
    specs: '18oz Waxed Canvas · Full-Grain Bridle Leather · 16" Padded Laptop Sleeve · Cabin Sized',
  },
  {
    id: 'prod_tempo_clock',
    name: 'Tempo Brushed Steel Desk Clock',
    slug: 'tempo-brushed-steel-desk-clock',
    description:
      'Silent-sweep quartz movement encased in a lathe-turned 316L brushed stainless steel bezel with a deep matte charcoal dial and precision-milled baton indices.',
    price: 165,
    stock: 18,
    categoryId: 'cat_objects',
    categoryName: 'Carry & Objects',
    imageUrl: STORE_MEDIA.analogClock,
    featured: false,
    isNewArrival: false,
    sku: 'KF-OBJ-015',
    specs: '316L Stainless Steel · Silent Japanese Sweep Movement · Anti-Reflective Mineral Glass',
  },
];

export function buildSeedPreviewCategories(): Category[] {
  const now = new Date().toISOString();
  return INITIAL_SEED_CATEGORIES.map((c) => ({ ...c, createdAt: now, updatedAt: now }));
}

export function buildSeedPreviewProducts(): Product[] {
  const now = new Date().toISOString();
  return INITIAL_SEED_PRODUCTS.map((p) => ({ ...p, createdAt: now, updatedAt: now }));
}
