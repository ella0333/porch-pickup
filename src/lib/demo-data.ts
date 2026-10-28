// The fictional demo town. Street names are made up; the map area is central Austin, Texas.

export const DEMO_CENTER = { lat: 30.2672, lng: -97.7431 };
export const DEMO_TZ = "America/Chicago";

export type DemoSeller = {
  key: string;
  name: string;
  address: string;
  // Offset from the town center in degrees.
  dLat: number;
  dLng: number;
  instructions: string;
  startMinute: number;
  endMinute: number;
};

export const DEMO_SELLERS: DemoSeller[] = [
  { key: "sam", name: "Sam", address: "14 Juniper Way, Maple Hollow", dLat: 0.012, dLng: -0.018, instructions: "On the bench to the left of the front door.", startMinute: 540, endMinute: 1260 },
  { key: "priya", name: "Priya", address: "203 Larkspur Lane, Maple Hollow", dLat: -0.021, dLng: 0.009, instructions: "Inside the screened porch, the door is unlocked. Leave it closed behind you.", startMinute: 600, endMinute: 1200 },
  { key: "marcus", name: "Marcus", address: "77 Cedar Bluff Road, Maple Hollow", dLat: 0.034, dLng: 0.022, instructions: "Next to the blue recycling bin by the garage.", startMinute: 480, endMinute: 1320 },
  { key: "elena", name: "Elena", address: "9 Willow Bend, Maple Hollow", dLat: -0.008, dLng: -0.035, instructions: "Under the covered porch by the swing, labeled with your name.", startMinute: 720, endMinute: 1260 },
  { key: "theo", name: "Theo", address: "418 Pecan Street, Maple Hollow", dLat: 0.046, dLng: -0.006, instructions: "On the side porch, use the gate on the right.", startMinute: 540, endMinute: 1140 },
  { key: "rosa", name: "Rosa", address: "61 Bluebonnet Court, Maple Hollow", dLat: -0.039, dLng: -0.021, instructions: "On the front step behind the potted plants.", startMinute: 600, endMinute: 1320 },
];

export const DEMO_BUYERS = [
  { key: "alex", name: "Alex" },
  { key: "jordan", name: "Jordan" },
];

export type DemoListing = {
  seller: string;
  photo: string;
  title: string;
  description: string;
  category: string;
  condition: "NEW" | "LIKE_NEW" | "GOOD" | "FAIR" | "POOR";
  flaws: string[];
  price: number; // dollars
  reason: string;
};

export const DEMO_LISTINGS: DemoListing[] = [
  { seller: "sam", photo: "acoustic-guitar", title: "Dreadnought acoustic guitar with stand", description: "Full size steel string acoustic. Plays well and holds tune. The floor stand is included.", category: "Other", condition: "GOOD", flaws: ["light pick wear near the sound hole"], price: 110, reason: "Good condition, light pick wear. Used ones listed $90 to $150 on eBay. About $260 new." },
  { seller: "sam", photo: "cordless-drill", title: "Cordless drill driver with battery", description: "Two speed cordless drill. Battery holds a charge for a weekend of projects. No charger.", category: "Tools & Garden", condition: "FAIR", flaws: ["scuffed housing", "no charger included"], price: 20, reason: "Fair condition, scuffed housing, no charger. Used ones listed $18 to $45 on eBay." },
  { seller: "sam", photo: "desk-lamp", title: "Black gooseneck desk lamp", description: "Adjustable gooseneck lamp with a weighted base. Takes a standard bulb, bulb included.", category: "Home & Kitchen", condition: "GOOD", flaws: [], price: 10, reason: "Good condition. Used ones listed $8 to $15 on eBay. About $25 new." },
  { seller: "priya", photo: "balance-bike", title: "Wooden balance bike, red tires", description: "Bent wood balance bike for ages 2 to 4. Adjustable seat, foam tires never go flat.", category: "Baby & Kids", condition: "LIKE_NEW", flaws: [], price: 55, reason: "Like new condition. Used ones listed $40 to $60 on eBay. About $120 new." },
  { seller: "priya", photo: "building-blocks", title: "Bin of large toddler building blocks", description: "About 80 chunky blocks, compatible with the big toddler size bricks. Washed and ready.", category: "Toys & Games", condition: "GOOD", flaws: ["some fading on the pink blocks"], price: 15, reason: "Good condition, some fading. Used lots listed $12 to $25 on eBay. About $40 new." },
  { seller: "priya", photo: "monstera", title: "Faux potted plant in white ceramic pot", description: "Realistic artificial plant, about 14 inches tall. No watering, looks great on a counter.", category: "Home & Kitchen", condition: "LIKE_NEW", flaws: [], price: 15, reason: "Like new condition. About $30 new." },
  { seller: "marcus", photo: "reel-mower", title: "Vintage push reel mower, needs work", description: "Old manual reel mower. The reel still turns but the blades need sharpening and the handle grips are gone. Great restoration project or yard decor.", category: "Tools & Garden", condition: "POOR", flaws: ["heavy rust on the reel", "missing handle grips", "dull blades"], price: 15, reason: "Poor condition, heavy rust. Used ones listed $30 to $70 on eBay, priced for parts." },
  { seller: "marcus", photo: "tent", title: "Four person dome tent with rainfly", description: "Two pole dome tent, sets up in ten minutes. Rainfly, stakes and carry bag included. Used on three trips.", category: "Sports & Outdoors", condition: "LIKE_NEW", flaws: [], price: 60, reason: "Like new condition. Used ones listed $45 to $70 on eBay. About $130 new." },
  { seller: "marcus", photo: "skateboard", title: "Classic 90s skateboard deck with trucks", description: "Old school wide deck with trucks and wheels. Rides fine, graphics are worn from real use.", category: "Sports & Outdoors", condition: "FAIR", flaws: ["chipped tail", "worn graphics", "grip tape peeling"], price: 25, reason: "Fair condition, chipped tail. Used ones listed $25 to $60 on eBay." },
  { seller: "elena", photo: "typewriter", title: "Portable manual typewriter in black", description: "Classic portable typewriter. All keys strike, carriage returns smoothly. Ribbon is dry and will need replacing.", category: "Other", condition: "GOOD", flaws: ["dry ribbon", "small paint chips on the frame"], price: 85, reason: "Good condition, dry ribbon. Used ones listed $70 to $140 on eBay." },
  { seller: "elena", photo: "books", title: "Lot of old hardcover books", description: "Stack of antique hardcovers, great for shelves or decor. Spines are worn but pages are intact.", category: "Books & Media", condition: "FAIR", flaws: ["worn spines", "foxing on some pages"], price: 12, reason: "Fair condition, worn spines. Used lots listed $10 to $30 on eBay." },
  { seller: "elena", photo: "winter-coat", title: "Gray herringbone wool overcoat", description: "Men's medium wool blend overcoat, fully lined. Warm and sharp, dry cleaned last winter.", category: "Clothing & Shoes", condition: "LIKE_NEW", flaws: [], price: 45, reason: "Like new condition. Used ones listed $35 to $60 on eBay. About $180 new." },
  { seller: "theo", photo: "rocking-chair", title: "Solid wood rocking chair", description: "Sturdy wooden rocker that fits a porch or nursery. Smooth rock, no wobble.", category: "Furniture", condition: "GOOD", flaws: ["finish worn on the armrests"], price: 60, reason: "Good condition, worn armrests. Used ones listed $45 to $90 on eBay." },
  { seller: "theo", photo: "dining-chairs", title: "Windsor style wooden dining chair", description: "Spindle back dining chair in dark stain. Solid and comfortable. One chair.", category: "Furniture", condition: "GOOD", flaws: ["small scratches on the seat"], price: 30, reason: "Good condition, small scratches. Used ones listed $25 to $45 on eBay." },
  { seller: "theo", photo: "monitor", title: "19 inch LCD monitor with stand", description: "Square 19 inch monitor with VGA and DVI inputs. Power cable included, no dead pixels.", category: "Electronics", condition: "GOOD", flaws: [], price: 20, reason: "Good condition. Used ones listed $15 to $30 on eBay." },
  { seller: "rosa", photo: "bookshelf", title: "White cube bookshelf, 8 cubbies", description: "Tall white shelf with eight open cubbies. Easy to move, it comes apart into two pieces.", category: "Furniture", condition: "GOOD", flaws: ["scuff on the left side panel"], price: 35, reason: "Good condition, scuff on side. Used ones listed $30 to $50 on eBay. About $90 new." },
  { seller: "rosa", photo: "boots", title: "Brown leather chukka boots, men's 10", description: "Genuine leather chukkas with laces. Worn a handful of times, soles barely used.", category: "Clothing & Shoes", condition: "LIKE_NEW", flaws: [], price: 40, reason: "Like new condition. Used ones listed $30 to $55 on eBay. About $140 new." },
  { seller: "rosa", photo: "cast-iron-skillet", title: "12 inch cast iron skillet, seasoned", description: "Well seasoned cast iron pan with helper handle. Cooks like a dream, no rust.", category: "Home & Kitchen", condition: "GOOD", flaws: [], price: 20, reason: "Good condition. Used ones listed $15 to $30 on eBay. About $35 new." },
];

// Past sales so profiles start with a few reviews.
export const DEMO_HISTORY = [
  { seller: "sam", buyer: "jordan", title: "Box fan", photo: "desk-lamp", price: 15, sellerStars: 5, sellerText: "Item was right where Sam said. Easy pickup.", buyerStars: 5, buyerText: "Came on time and confirmed right away." },
  { seller: "priya", buyer: "alex", title: "Kids rain boots", photo: "boots", price: 8, sellerStars: 5, sellerText: "Bagged and labeled on the porch. Great seller.", buyerStars: 5, buyerText: "Smooth sale." },
  { seller: "marcus", buyer: "jordan", title: "Folding camp chair", photo: "tent", price: 10, sellerStars: 4, sellerText: "Chair was there, a little dustier than the photos.", buyerStars: 5, buyerText: "No problems at all." },
  { seller: "elena", buyer: "alex", title: "Picture frames", photo: "books", price: 12, sellerStars: 5, sellerText: "Exactly as described.", buyerStars: 4, buyerText: "Picked up a bit late but let me know." },
  { seller: "theo", buyer: "jordan", title: "Bar stool", photo: "dining-chairs", price: 20, sellerStars: 5, sellerText: "Easy to find on the side porch.", buyerStars: 5, buyerText: "Great buyer." },
];
