import { getWeekDates, formatDate, formatDateShort, getWeekNumber } from '@/lib/dates';
import { fetchWeek } from '@/lib/scraper';
import { filterWeek, type FilteredMensaDay } from '@/lib/filter';

export const dynamic = 'force-dynamic';

const MENSEN = ['Philosophenweg', 'Ernst-Abbe-Platz', 'Uni-Hauptgebäude'];

function MensaCell({ data }: { data: FilteredMensaDay }) {
  return (
    <div className="mensa-cell">
      <div className="mensa-name">{data.mensa}</div>
      {data.meals.length === 0 ? (
        <p className="nothing">nichts Geeignetes</p>
      ) : (
        <ul className="meal-list">
          {data.meals.map((meal, i) => (
            <li key={i} className={`meal-item ${meal.status}`}>
              <div className="meal-title">
                {meal.status === 'suitable' ? '✅' : '⚠️'} {meal.title}
              </div>
              {meal.skipComponents.length > 0 && (
                <div className="meal-skip">weglassen: {meal.skipComponents.join(', ')}</div>
              )}
              <div className="meal-category">{meal.category}</div>
            </li>
          ))}
        </ul>
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
      <header>
        <h1>Mensa-Check Jena</h1>
        <p>vegane &amp; glutenfreie Gerichte · KW {kw}</p>
      </header>

      <div className="container">
        <div className="week-grid">
          {week.map((dayMensen, dayIdx) => {
            const date = dates[dayIdx];
            return (
              <div key={date} className="day-row">
                <div className="day-header">{formatDate(date)}</div>
                <div className="mensa-grid">
                  {MENSEN.map((name) => {
                    const data = dayMensen.find((m) => m.mensa === name) ?? {
                      mensa: name,
                      date,
                      meals: [],
                    };
                    return <MensaCell key={name} data={data} />;
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="legend">
          <span><span style={{ background: '#d8f3dc', padding: '2px 6px', borderRadius: 4 }}>✅ geeignet</span> — vegan &amp; glutenfrei</span>
          <span><span style={{ background: '#fff3cd', padding: '2px 6px', borderRadius: 4 }}>⚠️ bedingt</span> — vegan, nur Beilage weglassen</span>
        </div>
      </div>
    </>
  );
}
