/**
 * Item suggestions, organised by list category and sub-category.
 *
 * CORPUS maps a list category (e.g. 'shopping', 'packing') to an ordered
 * array of SuggestionCategory objects.  Each category has a label and a flat
 * list of items.
 *
 * getItemCategory: given an item title and list category, returns the
 * sub-category label (e.g. 'Fruit & Veg') or null if not found.
 *
 * filterSuggestions: prefix matches ranked above substring matches,
 * case-insensitive, excluding items already on the list.
 */

export interface SuggestionCategory {
  label: string
  items: readonly string[]
}

// ---------------------------------------------------------------------------
// Shopping
// ---------------------------------------------------------------------------

const SHOPPING: readonly SuggestionCategory[] = [
  {
    label: 'Fruit & Veg',
    items: [
      'Apples', 'Bananas', 'Oranges', 'Lemons', 'Limes', 'Grapes', 'Strawberries',
      'Blueberries', 'Raspberries', 'Avocados', 'Tomatoes', 'Cucumber', 'Lettuce',
      'Spinach', 'Kale', 'Broccoli', 'Cauliflower', 'Carrots', 'Celery', 'Onions',
      'Red onions', 'Spring onions', 'Garlic', 'Ginger', 'Potatoes', 'Sweet potatoes',
      'Mushrooms', 'Peppers', 'Courgette', 'Aubergine', 'Corn', 'Peas', 'Green beans',
      'Asparagus', 'Beetroot', 'Cabbage', 'Pumpkin', 'Butternut squash', 'Mango',
      'Pineapple', 'Watermelon', 'Melon', 'Pears', 'Peaches', 'Plums', 'Cherries',
      'Kiwi', 'Pomegranate', 'Coconut',
    ],
  },
  {
    label: 'Dairy & Eggs',
    items: [
      'Milk', 'Semi-skimmed milk', 'Whole milk', 'Oat milk', 'Almond milk',
      'Soy milk', 'Butter', 'Eggs', 'Free-range eggs', 'Cream', 'Single cream',
      'Double cream', 'Crème fraîche', 'Sour cream', 'Yoghurt', 'Greek yoghurt',
      'Cheese', 'Cheddar', 'Mozzarella', 'Parmesan', 'Feta', 'Cream cheese',
      'Cottage cheese', 'Brie', 'Gouda',
    ],
  },
  {
    label: 'Meat & Fish',
    items: [
      'Chicken breasts', 'Chicken thighs', 'Chicken mince', 'Beef mince', 'Beef steak',
      'Pork chops', 'Pork mince', 'Bacon', 'Sausages', 'Ham', 'Salmon', 'Cod',
      'Tuna steaks', 'Tuna (tinned)', 'Prawns', 'Mackerel', 'Haddock', 'Sardines',
      'Turkey mince', 'Lamb mince', 'Lamb chops',
    ],
  },
  {
    label: 'Bread & Bakery',
    items: [
      'Bread', 'White bread', 'Wholemeal bread', 'Sourdough', 'Baguette', 'Pitta bread',
      'Wraps', 'Crumpets', 'English muffins', 'Bagels', 'Rolls', 'Tortillas',
      'Breadcrumbs', 'Croissants',
    ],
  },
  {
    label: 'Pantry',
    items: [
      'Pasta', 'Spaghetti', 'Penne', 'Rice', 'Basmati rice', 'Brown rice', 'Risotto rice',
      'Noodles', 'Couscous', 'Quinoa', 'Lentils', 'Chickpeas', 'Kidney beans',
      'Black beans', 'Baked beans', 'Flour', 'Plain flour', 'Self-raising flour',
      'Sugar', 'Brown sugar', 'Icing sugar', 'Salt', 'Pepper', 'Olive oil',
      'Vegetable oil', 'Sunflower oil', 'Coconut oil', 'Balsamic vinegar', 'White wine vinegar',
      'Red wine vinegar', 'Soy sauce', 'Fish sauce', 'Worcestershire sauce', 'Ketchup',
      'Mayonnaise', 'Mustard', 'Dijon mustard', 'Honey', 'Maple syrup', 'Peanut butter',
      'Jam', 'Marmalade', 'Nutella', 'Oats', 'Porridge oats', 'Cornflakes', 'Granola',
      'Muesli', 'Crackers', 'Rice cakes', 'Popcorn', 'Crisps', 'Chocolate', 'Biscuits',
    ],
  },
  {
    label: 'Tinned & Jarred',
    items: [
      'Chopped tomatoes', 'Passata', 'Tomato purée', 'Coconut milk', 'Vegetable stock',
      'Chicken stock', 'Beef stock', 'Olives', 'Capers', 'Sun-dried tomatoes',
      'Sweetcorn', 'Artichoke hearts', 'Lentils (tinned)', 'Chickpeas (tinned)',
    ],
  },
  {
    label: 'Frozen',
    items: [
      'Frozen peas', 'Frozen sweetcorn', 'Frozen spinach', 'Frozen chips', 'Frozen pizza',
      'Ice cream', 'Frozen berries', 'Frozen prawns',
    ],
  },
  {
    label: 'Herbs & Spices',
    items: [
      'Cumin', 'Coriander', 'Paprika', 'Smoked paprika', 'Turmeric', 'Chilli flakes',
      'Chilli powder', 'Curry powder', 'Garam masala', 'Cinnamon', 'Nutmeg', 'Oregano',
      'Thyme', 'Rosemary', 'Basil', 'Bay leaves', 'Mixed herbs', 'Parsley', 'Dill',
      'Mint', 'Cardamom', 'Cayenne pepper', 'Vanilla extract', 'Baking powder',
      'Bicarbonate of soda', 'Yeast',
    ],
  },
  {
    label: 'Hot Drinks',
    items: [
      'Coffee', 'Instant coffee', 'Ground coffee', 'Coffee pods', 'Tea', 'Herbal tea',
      'Green tea', 'Chamomile tea', 'Peppermint tea', 'Hot chocolate', 'Cocoa powder',
      'Decaf coffee', 'Decaf tea',
    ],
  },
  {
    label: 'Soft Drinks',
    items: [
      'Water', 'Sparkling water', 'Orange juice', 'Apple juice', 'Cranberry juice',
      'Pineapple juice', 'Grape juice', 'Tomato juice', 'Lemonade', 'Fizzy water',
      'Coca-Cola', 'Diet Coke', 'Pepsi', 'Lemon squash', 'Orange squash', 'Elderflower cordial',
      'Blackcurrant cordial', 'Energy drink', 'Sports drink', 'Ginger beer',
    ],
  },
  {
    label: 'Alcohol',
    items: [
      'Beer', 'Lager', 'Ale', 'Stout', 'Cider', 'White wine', 'Red wine', 'Rosé wine',
      'Prosecco', 'Champagne', 'Gin', 'Vodka', 'Rum', 'Whisky', 'Tequila', 'Baileys',
      'Aperol', 'Vermouth', 'Port', 'Sherry', 'Sake',
    ],
  },
  {
    label: 'Household',
    items: [
      'Washing-up liquid', 'Dishwasher tablets', 'Dishwasher salt', 'Dishwasher rinse aid',
      'Laundry detergent', 'Fabric softener', 'Toilet paper', 'Kitchen roll', 'Bin bags',
      'Food bags', 'Cling film', 'Foil', 'Washing powder', 'Bleach', 'Bathroom cleaner',
      'Kitchen cleaner', 'Sponges', 'Rubber gloves', 'Hand soap', 'Shower gel',
      'Shampoo', 'Conditioner', 'Toothpaste', 'Toothbrushes', 'Deodorant',
      'Moisturiser', 'Sunscreen', 'Nappies', 'Wipes',
    ],
  },
]

// ---------------------------------------------------------------------------
// Packing
// ---------------------------------------------------------------------------

const PACKING: readonly SuggestionCategory[] = [
  {
    label: 'Clothes',
    items: [
      'T-shirts', 'Shirts', 'Trousers', 'Jeans', 'Shorts', 'Skirt', 'Dress',
      'Jumper', 'Hoodie', 'Jacket', 'Coat', 'Swimwear', 'Pyjamas',
      'Underwear', 'Socks', 'Tights', 'Belt', 'Shoes', 'Sandals', 'Trainers',
      'Smart shoes', 'Flip flops', 'Hat', 'Scarf', 'Gloves', 'Sunglasses',
    ],
  },
  {
    label: 'Toiletries',
    items: [
      'Toothbrush', 'Toothpaste', 'Dental floss', 'Shampoo', 'Conditioner',
      'Shower gel', 'Soap', 'Deodorant', 'Razor', 'Shaving cream', 'Moisturiser',
      'Sunscreen', 'Lip balm', 'Hairbrush', 'Comb', 'Hair ties', 'Makeup',
      'Makeup remover', 'Cotton buds', 'Cotton pads', 'Perfume', 'Cologne',
      'Face wash', 'Tweezers', 'Nail clippers',
    ],
  },
  {
    label: 'Electronics',
    items: [
      'Phone charger', 'Laptop charger', 'Laptop', 'Tablet', 'Earphones',
      'Headphones', 'Power bank', 'Travel adapter', 'Camera', 'Camera charger',
      'Memory card', 'USB cable', 'HDMI cable', 'E-reader', 'Smartwatch charger',
    ],
  },
  {
    label: 'Documents',
    items: [
      'Passport', 'Driving licence', 'Travel insurance', 'Flight tickets',
      'Hotel booking', 'Visa', 'EHIC card', 'Vaccination certificate',
      'Emergency contacts', 'Travel itinerary',
    ],
  },
  {
    label: 'Health',
    items: [
      'Prescription medication', 'Painkillers', 'Antihistamines', 'Plasters',
      'Antiseptic cream', 'Insect repellent', 'Motion sickness tablets',
      'Vitamins', 'Hand sanitiser', 'Face masks', 'Eye drops', 'Ear plugs',
    ],
  },
  {
    label: 'Accessories',
    items: [
      'Luggage padlock', 'Luggage tags', 'Travel pillow', 'Eye mask',
      'Reusable water bottle', 'Umbrella', 'Backpack', 'Day bag', 'Wallet',
      'Cash', 'Travel cards', 'Book', 'Playing cards', 'Notebook', 'Pen',
    ],
  },
]

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/** Corpus keyed by list category string. */
export const CORPUS: Record<string, readonly SuggestionCategory[]> = {
  shopping: SHOPPING,
  packing: PACKING,
}

/** Flat list derived from the shopping corpus — used by filterSuggestions. */
export const GROCERY_SUGGESTIONS: readonly string[] = SHOPPING.flatMap(c => [...c.items])

/**
 * Return the sub-category label for a given item title + list category,
 * or null if the corpus has no entry for this list category or item title.
 *
 * Matching is case-insensitive and exact (no partial matching).
 */
export function getItemCategory(title: string, listCategory: string): string | null {
  const corpus = CORPUS[listCategory]
  if (!corpus) return null
  const lower = title.toLowerCase()
  for (const cat of corpus) {
    if (cat.items.some(item => item.toLowerCase() === lower)) return cat.label
  }
  return null
}

/**
 * Filter suggestions for a query string.
 *
 * - Prefix matches are ranked first (query matches start of word)
 * - Then contains matches (query appears anywhere in the string)
 * - Already-listed titles are excluded (case-insensitive)
 * - Results are limited to `limit` items (default 6)
 */
export function filterSuggestions(
  query: string,
  existingTitles: string[] = [],
  limit = 6,
): string[] {
  const q = query.trim().toLowerCase()
  if (!q) return []

  const excluded = new Set(existingTitles.map(t => t.toLowerCase()))

  const prefix: string[] = []
  const contains: string[] = []

  for (const s of GROCERY_SUGGESTIONS) {
    const lower = s.toLowerCase()
    if (excluded.has(lower)) continue
    if (lower.startsWith(q)) {
      prefix.push(s)
    } else if (lower.includes(q)) {
      contains.push(s)
    }
    if (prefix.length + contains.length >= limit * 2) break   // early exit
  }

  return [...prefix, ...contains].slice(0, limit).sort((a, b) => a.localeCompare(b))
}
