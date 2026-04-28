import type { Meal, MensaDay } from './scraper';

export const GLUTEN_CODES = ['Wz', 'Di', 'Ge', 'Ro', 'Ka', 'Km'];
const HAFER_CODE = 'Hf';

const INCLUDE_CATEGORIES = ['mittagessen', 'abendessen', 'mittagsversorgung', 'abendmensa', 'mittag', 'abend'];
const EXCLUDE_CATEGORIES = ['frühstück', 'fruehstueck', 'breakfast', 'zwischenversorgung', 'zwischen'];

// Keywords that make a component "skippable" (bread/roll side dish)
const SIDE_KEYWORDS = ['brötchen', 'brot', 'breze', 'toast', 'semmel', 'rolle', 'baguette', 'ciabatta', 'focaccia'];

export type MealStatus = 'suitable' | 'conditional' | 'unsuitable';

export interface FilteredMeal {
  title: string;
  status: MealStatus;
  skipComponents: string[];
  containsHafer: boolean;
  category: string;
  priceStudent: string | null;
}

export interface FilteredMensaDay {
  mensa: string;
  date: string;
  meals: FilteredMeal[];
}

function hasGluten(codes: string[]): boolean {
  return codes.some((code) => GLUTEN_CODES.includes(code));
}

function isSideComponent(name: string): boolean {
  const lower = name.toLowerCase();
  return SIDE_KEYWORDS.some((kw) => lower.includes(kw));
}

function isVegan(meal: Meal): boolean {
  // The XHR endpoint leaves meal-symbols empty — check component codes instead.
  // A meal is vegan if every component carries V*.
  if (meal.symbols.includes('V*')) return true;
  if (meal.components.length === 0) return false;
  return meal.components.every((c) => c.codes.includes('V*'));
}

function shouldInclude(categoryName: string): boolean {
  const lower = categoryName.toLowerCase().trim();
  if (EXCLUDE_CATEGORIES.some((ex) => lower.includes(ex))) return false;
  return INCLUDE_CATEGORIES.some((inc) => lower.includes(inc));
}

function filterMeal(meal: Meal, categoryName: string): FilteredMeal | null {
  if (!isVegan(meal)) return null;

  const containsHafer = meal.components.some((c) => c.codes.includes(HAFER_CODE));
  const glutenComponents = meal.components.filter((c) => hasGluten(c.codes));

  if (glutenComponents.length === 0) {
    return { title: meal.title, status: 'suitable', skipComponents: [], containsHafer, category: categoryName, priceStudent: meal.priceStudent };
  }

  // If ALL gluten-containing components are identifiable side dishes, meal is conditionally OK
  const nonSkippable = glutenComponents.filter((c) => !isSideComponent(c.name));
  if (nonSkippable.length === 0) {
    return {
      title: meal.title,
      status: 'conditional',
      skipComponents: glutenComponents.map((c) => c.name),
      containsHafer,
      category: categoryName,
      priceStudent: meal.priceStudent,
    };
  }

  return null;
}

export function filterMensaDay(day: MensaDay): FilteredMensaDay {
  const meals: FilteredMeal[] = [];

  for (const category of day.categories) {
    if (!shouldInclude(category.name)) continue;
    for (const meal of category.meals) {
      const filtered = filterMeal(meal, category.name);
      if (filtered) meals.push(filtered);
    }
  }

  return { mensa: day.mensa, date: day.date, meals };
}

export function filterWeek(week: MensaDay[][]): FilteredMensaDay[][] {
  return week.map((day) => day.map(filterMensaDay));
}
