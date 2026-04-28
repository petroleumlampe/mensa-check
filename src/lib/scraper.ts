import { load } from 'cheerio';

export interface Component {
  name: string;
  codes: string[];
}

export interface Meal {
  title: string;
  symbols: string[];
  components: Component[];
}

export interface Category {
  name: string;
  meals: Meal[];
}

export interface MensaDay {
  mensa: string;
  date: string;
  categories: Category[];
  error?: string;
}

// resources_id from the hidden #hiddenmensarscid field on each Mensa page
const MENSEN = [
  { name: 'Philosophenweg', rscid: '59' },
  { name: 'Ernst-Abbe-Platz', rscid: '41' },
  { name: 'Uni-Hauptgebäude', rscid: '64' },
];

const ENDPOINT = 'https://www.stw-thueringen.de/xhr/loadspeiseplan.html';

// date: YYYY-MM-DD → DD.MM.YYYY
function toGermanDate(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}

export async function fetchWeek(dates: string[]): Promise<MensaDay[][]> {
  return Promise.all(dates.map((date) => fetchDay(date)));
}

export async function fetchDay(date: string): Promise<MensaDay[]> {
  return Promise.all(MENSEN.map((m) => fetchMensaDay(m.name, m.rscid, date)));
}

async function fetchMensaDay(name: string, rscid: string, date: string): Promise<MensaDay> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `resources_id=${rscid}&date=${toGermanDate(date)}`,
      cache: 'no-store',
    });
    if (!res.ok) return { mensa: name, date, categories: [], error: `HTTP ${res.status}` };
    const html = await res.text();
    return { mensa: name, date, categories: parseHtml(html) };
  } catch (e) {
    return { mensa: name, date, categories: [], error: String(e) };
  }
}

function parseHtml(html: string): Category[] {
  const $ = load(html);
  const categories: Category[] = [];
  let current: Category | null = null;

  // XHR response is the *inner* HTML of #speiseplan (no wrapper element).
  // Full page has the wrapper. Support both.
  const scope = $('#speiseplan').length ? '#speiseplan ' : '';
  $(`${scope}.splGroupWrapper, ${scope}.rowMeal`)
    .each((_, el) => {
      if ($(el).hasClass('splGroupWrapper')) {
        const name = $(el).find('.splGroup').first().text().replace(/\s+/g, ' ').trim();
        if (name && name.length > 2 && !name.toLowerCase().includes('preis')) {
          current = { name, meals: [] };
          categories.push(current);
        }
      } else if ($(el).hasClass('rowMeal') && current) {
        const meal = parseMeal($, el);
        if (meal) current.meals.push(meal);
      }
    });

  return categories;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseMeal($: ReturnType<typeof load>, el: any): Meal | null {
  const title = $(el).find('.mealText').text().trim();
  if (!title) return null;

  const symbolsText = $(el).find('.meal-symbols').text().trim();
  const symbols = symbolsText.split(',').map((s: string) => s.trim()).filter(Boolean);

  const komponentenHtml = $(el).find('.komponenten strong').html() || '';
  let components = parseComponents(komponentenHtml);

  if (components.length === 0) {
    const allCodes = $(el).find('.kennzKommaliste').text().trim();
    components = [{ name: title, codes: allCodes.split(',').map((s: string) => s.trim()).filter(Boolean) }];
  }

  return { title, symbols, components };
}

function parseComponents(html: string): Component[] {
  const text = html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
  const parts = text.split('•').map((s) => s.trim()).filter(Boolean);

  return parts.flatMap((part) => {
    const match = part.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
    if (match) {
      return [{ name: match[1].trim(), codes: match[2].split(',').map((s) => s.trim()).filter(Boolean) }];
    }
    const name = part.trim();
    return name ? [{ name, codes: [] }] : [];
  });
}
