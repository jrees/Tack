/**
 * Shopping list suggestions.
 *
 * A curated list of common grocery/household items used to provide
 * autocomplete chips when adding items to a shopping list.
 *
 * filterSuggestions: prefix matches ranked above substring (contains) matches,
 * both case-insensitive. Already-added items are excluded.
 */

export const GROCERY_SUGGESTIONS: readonly string[] = [
  // Fruit & Veg
  'Apples', 'Bananas', 'Oranges', 'Lemons', 'Limes', 'Grapes', 'Strawberries',
  'Blueberries', 'Raspberries', 'Avocados', 'Tomatoes', 'Cucumber', 'Lettuce',
  'Spinach', 'Kale', 'Broccoli', 'Cauliflower', 'Carrots', 'Celery', 'Onions',
  'Red onions', 'Spring onions', 'Garlic', 'Ginger', 'Potatoes', 'Sweet potatoes',
  'Mushrooms', 'Peppers', 'Courgette', 'Aubergine', 'Corn', 'Peas', 'Green beans',
  'Asparagus', 'Beetroot', 'Cabbage', 'Pumpkin', 'Butternut squash', 'Mango',
  'Pineapple', 'Watermelon', 'Melon', 'Pears', 'Peaches', 'Plums', 'Cherries',
  'Kiwi', 'Pomegranate', 'Coconut',

  // Dairy & Eggs
  'Milk', 'Semi-skimmed milk', 'Whole milk', 'Oat milk', 'Almond milk',
  'Soy milk', 'Butter', 'Eggs', 'Free-range eggs', 'Cream', 'Single cream',
  'Double cream', 'Crème fraîche', 'Sour cream', 'Yoghurt', 'Greek yoghurt',
  'Cheese', 'Cheddar', 'Mozzarella', 'Parmesan', 'Feta', 'Cream cheese',
  'Cottage cheese', 'Brie', 'Gouda',

  // Meat & Fish
  'Chicken breasts', 'Chicken thighs', 'Chicken mince', 'Beef mince', 'Beef steak',
  'Pork chops', 'Pork mince', 'Bacon', 'Sausages', 'Ham', 'Salmon', 'Cod',
  'Tuna steaks', 'Tuna (tinned)', 'Prawns', 'Mackerel', 'Haddock', 'Sardines',
  'Turkey mince', 'Lamb mince', 'Lamb chops',

  // Bread & Bakery
  'Bread', 'White bread', 'Wholemeal bread', 'Sourdough', 'Baguette', 'Pitta bread',
  'Wraps', 'Crumpets', 'English muffins', 'Bagels', 'Rolls', 'Tortillas',
  'Breadcrumbs', 'Croissants',

  // Pantry / Dry goods
  'Pasta', 'Spaghetti', 'Penne', 'Rice', 'Basmati rice', 'Brown rice', 'Risotto rice',
  'Noodles', 'Couscous', 'Quinoa', 'Lentils', 'Chickpeas', 'Kidney beans',
  'Black beans', 'Baked beans', 'Flour', 'Plain flour', 'Self-raising flour',
  'Sugar', 'Brown sugar', 'Icing sugar', 'Salt', 'Pepper', 'Olive oil',
  'Vegetable oil', 'Sunflower oil', 'Coconut oil', 'Balsamic vinegar', 'White wine vinegar',
  'Red wine vinegar', 'Soy sauce', 'Fish sauce', 'Worcestershire sauce', 'Ketchup',
  'Mayonnaise', 'Mustard', 'Dijon mustard', 'Honey', 'Maple syrup', 'Peanut butter',
  'Jam', 'Marmalade', 'Nutella', 'Oats', 'Porridge oats', 'Cornflakes', 'Granola',
  'Muesli', 'Crackers', 'Rice cakes', 'Popcorn', 'Crisps', 'Chocolate', 'Biscuits',

  // Tinned & Jarred
  'Chopped tomatoes', 'Passata', 'Tomato purée', 'Coconut milk', 'Vegetable stock',
  'Chicken stock', 'Beef stock', 'Olives', 'Capers', 'Sun-dried tomatoes',
  'Sweetcorn', 'Artichoke hearts', 'Lentils (tinned)', 'Chickpeas (tinned)',

  // Frozen
  'Frozen peas', 'Frozen sweetcorn', 'Frozen spinach', 'Frozen chips', 'Frozen pizza',
  'Ice cream', 'Frozen berries', 'Frozen prawns',

  // Herbs & Spices
  'Cumin', 'Coriander', 'Paprika', 'Smoked paprika', 'Turmeric', 'Chilli flakes',
  'Chilli powder', 'Curry powder', 'Garam masala', 'Cinnamon', 'Nutmeg', 'Oregano',
  'Thyme', 'Rosemary', 'Basil', 'Bay leaves', 'Mixed herbs', 'Parsley', 'Dill',
  'Mint', 'Cardamom', 'Cayenne pepper', 'Vanilla extract', 'Baking powder',
  'Bicarbonate of soda', 'Yeast',

  // Drinks
  'Orange juice', 'Apple juice', 'Water', 'Sparkling water', 'Coffee', 'Instant coffee',
  'Tea', 'Herbal tea', 'Cocoa powder', 'Hot chocolate',

  // Household
  'Washing-up liquid', 'Dishwasher tablets', 'Dishwasher salt', 'Dishwasher rinse aid',
  'Laundry detergent', 'Fabric softener', 'Toilet paper', 'Kitchen roll', 'Bin bags',
  'Food bags', 'Cling film', 'Foil', 'Washing powder', 'Bleach', 'Bathroom cleaner',
  'Kitchen cleaner', 'Sponges', 'Rubber gloves', 'Hand soap', 'Shower gel',
  'Shampoo', 'Conditioner', 'Toothpaste', 'Toothbrushes', 'Deodorant',
  'Moisturiser', 'Sunscreen', 'Nappies', 'Wipes',
]

/**
 * Filter suggestions for a query string.
 *
 * - Prefix matches are ranked first (query matches start of word)
 * - Then contains matches (query appears anywhere in the string)
 * - Already-listed titles are excluded (case-insensitive)
 * - Results are limited to `limit` items (default 6)
 *
 * @param query           Current input text
 * @param existingTitles  Titles already on the list (to exclude)
 * @param limit           Max number of suggestions to return (default 6)
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

  return [...prefix, ...contains].slice(0, limit)
}
