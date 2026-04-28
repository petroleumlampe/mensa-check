import { getWeekDates, getWeekNumber } from '@/lib/dates';
import { fetchWeek } from '@/lib/scraper';
import { filterWeek, type FilteredMeal, type FilteredMensaDay } from '@/lib/filter';

export const dynamic = 'force-dynamic';

const MENSEN = ['Philosophenweg', 'Ernst-Abbe-Platz', 'Uni-Hauptgebäude'];
const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];

function parseDateParts(iso: string) {
  const [, m, d] = iso.split('-');
  return { day: d.replace(/^0/, ''), month: MONTHS[parseInt(m) - 1] };
}

function isPastDate(iso: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(iso + 'T12:00:00');
  date.setHours(0, 0, 0, 0);
  return date < today;
}

function MealCard({ meal }: { meal: FilteredMeal }) {
  return (
    <div className={`meal ${meal.status}`}>
      <div className="meal-name">{meal.title}</div>
      {meal.skipComponents.length > 0 && (
        <div className="meal-skip">ohne {meal.skipComponents.join(', ')}</div>
      )}
      {meal.containsHafer && (
        <div className="meal-hafer">enthält Hafer (Hf)</div>
      )}
      {meal.priceStudent && (
        <div className="meal-footer">
          <span className="meal-price">{meal.priceStudent}</span>
        </div>
      )}
    </div>
  );
}

const DINNER_CATEGORIES = ['abendessen', 'abendmensa', 'abend'];

function isDinner(meal: FilteredMeal): boolean {
  return DINNER_CATEGORIES.some((cat) => meal.category.toLowerCase().includes(cat));
}

function MensaCol({ data }: { data: FilteredMensaDay }) {
  const lunchMeals = data.meals.filter((m) => !isDinner(m));
  const dinnerMeals = data.meals.filter((m) => isDinner(m));

  return (
    <div className="mensa-col">
      <div className="mensa-label">{data.mensa}</div>
      {lunchMeals.length === 0 && dinnerMeals.length === 0 ? (
        <div className="empty">–</div>
      ) : (
        <>
          {lunchMeals.map((meal, i) => <MealCard key={i} meal={meal} />)}
          {dinnerMeals.length > 0 && (
            <div className="dinner-block">
              <div className="dinner-label">Abend</div>
              <div className="dinner-meals">
                {dinnerMeals.map((meal, i) => <MealCard key={i} meal={meal} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default async function Page() {
  const dates = getWeekDates();
  const raw = await fetchWeek(dates);
  const week = filterWeek(raw);
  const kw = getWeekNumber();

  return (
    <>
      <header className="site-header">
        <h1 className="site-title">Was kann<br />ich essen</h1>
        <div className="site-meta">
          <span className="kw-badge">KW {kw}</span>
          <br />Jena · 3 Mensen
          <br />vegan · glutenfrei
        </div>
      </header>

      <main className="week">
        {week.map((dayMensen, i) => {
          const { day, month } = parseDateParts(dates[i]);
          const isPast = isPastDate(dates[i]);
          const empty = !isPast && dayMensen.every((m) => m.meals.length === 0);

          return (
            <section key={dates[i]} className={`day${isPast ? ' day--past' : ''}`}>
              <div className="day-label">
                <span className="day-name">{WEEKDAYS[i]}</span>
                <span className="day-number">{day}</span>
                <span className="day-month">{month}</span>
              </div>

              {empty ? (
                <div className="day-nichts">nichts :/</div>
              ) : (
                <div className="mensen">
                  {MENSEN.map((name) => {
                    const data = dayMensen.find((m) => m.mensa === name) ?? { mensa: name, date: dates[i], meals: [] };
                    return <MensaCol key={name} data={data} />;
                  })}
                </div>
              )}
            </section>
          );
        })}
      </main>

      <footer className="legend">
        <div className="legend-item">
          <div className="legend-swatch suitable" />
          <span>vegan &amp; glutenfrei</span>
        </div>
        <div className="legend-item">
          <div className="legend-swatch conditional" />
          <span>geeignet, Beilage weglassen</span>
        </div>
      </footer>
    </>
  );
}
