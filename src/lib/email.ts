import { Resend } from 'resend';
import type { FilteredMensaDay } from './filter';
import { formatDate, getWeekNumber } from './dates';

export async function sendWeeklyEmail(week: FilteredMensaDay[][]): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  if (!apiKey || !to) {
    console.warn('RESEND_API_KEY or EMAIL_TO not configured');
    return;
  }

  const resend = new Resend(apiKey);
  const kw = getWeekNumber();

  await resend.emails.send({
    from,
    to,
    subject: `Was kann ich essen – KW ${kw}`,
    html: buildHtml(week, kw),
    text: buildText(week),
  });
}

function buildHtml(week: FilteredMensaDay[][], kw: number): string {
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  const MONTHS = ['Jan', 'Feb', 'Mrz', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  const MENSEN = ['Philosophenweg', 'Ernst-Abbe-Platz', 'Uni-Hauptgebäude'];

  function parseDateParts(iso: string) {
    const [, m, d] = iso.split('-');
    return { day: d.replace(/^0/, ''), month: MONTHS[parseInt(m) - 1] };
  }

  const renderMeal = (meal: FilteredMensaDay['meals'][0]): string => {
    let s = `<div class="meal ${meal.status}">`;
    s += `<div class="meal-name">${meal.title}</div>`;
    if (meal.skipComponents.length > 0) s += `<div class="meal-skip">ohne ${meal.skipComponents.join(', ')}</div>`;
    if (meal.containsHafer) s += `<div class="meal-hafer">enthält Hafer (Hf)</div>`;
    if (meal.priceStudent) s += `<div class="meal-price">${meal.priceStudent}</div>`;
    s += `</div>`;
    return s;
  };

  const url = process.env.NEXT_PUBLIC_URL || 'https://waskannichessen.vercel.app';

  let html = `
<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f7f6f4; color: #0a0a0a; font-family: 'Helvetica Neue', Arial, sans-serif; }
  .wrap { max-width: 680px; margin: 0 auto; background: #f7f6f4; }

  .header { border-bottom: 2px solid #0a0a0a; padding: 32px 32px 12px; display: table; width: 100%; }
  .header-left { display: table-cell; vertical-align: bottom; }
  .header-right { display: table-cell; vertical-align: bottom; text-align: right; }
  .title { font-size: 42px; font-weight: 700; letter-spacing: -0.03em; line-height: 0.9; text-transform: uppercase; }
  .meta { font-size: 11px; font-weight: 300; letter-spacing: 0.12em; text-transform: uppercase; color: #888; line-height: 1.8; }
  .kw-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; border: 1.5px solid #0a0a0a; padding: 3px 10px; display: inline-block; margin-bottom: 6px; }

  .day-row { display: table; width: 100%; border-bottom: 1px solid #d8d8d8; }
  .day-label { display: table-cell; width: 90px; border-right: 1px solid #d8d8d8; padding: 20px 16px 20px 32px; vertical-align: top; }
  .day-name { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #888; display: block; }
  .day-number { font-size: 52px; font-weight: 700; letter-spacing: -0.04em; line-height: 0.85; color: #0a0a0a; display: block; margin-top: 4px; }
  .day-month { font-size: 10px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; color: #888; margin-top: 6px; display: block; }

  .mensen { display: table-cell; vertical-align: top; }
  .mensa-col { display: table-cell; width: 33.33%; border-right: 1px solid #d8d8d8; padding: 14px 14px; vertical-align: top; }
  .mensa-col:last-child { border-right: none; }
  .mensa-label { font-size: 9px; font-weight: 700; letter-spacing: 0.15em; text-transform: uppercase; color: #888; margin-bottom: 10px; }

  .meal { margin-bottom: 8px; padding: 8px 10px 8px 12px; }
  .meal.suitable { background: #0a0a0a; color: #f7f6f4; border-left: 3px solid #0a0a0a; }
  .meal.conditional { background: #f7f6f4; border: 1px solid #0a0a0a; border-left-width: 3px; }
  .meal-name { font-size: 12px; font-weight: 500; line-height: 1.35; letter-spacing: -0.01em; }
  .meal-skip { font-size: 10px; font-weight: 300; letter-spacing: 0.04em; margin-top: 3px; color: #aaa; }
  .meal.conditional .meal-skip { color: #888; }
  .meal-hafer { font-size: 10px; font-weight: 300; letter-spacing: 0.04em; margin-top: 3px; color: #aaa; font-style: italic; }
  .meal.conditional .meal-hafer { color: #888; }
  .meal-price { font-size: 11px; font-weight: 700; letter-spacing: 0.05em; margin-top: 5px; }
  .meal.suitable .meal-price { color: #d8d8d8; }
  .meal.conditional .meal-price { color: #888; }

  .dinner-block { margin-top: 10px; }
  .dinner-label { font-size: 9px; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase; color: #888; padding-bottom: 6px; border-bottom: 1px solid #d8d8d8; margin-bottom: 6px; }
  .dinner-meals { background-color: #eceae7; padding: 6px; }

  .day-nichts { padding: 20px 32px; font-size: 20px; font-weight: 300; color: #d8d8d8; }
  .empty { font-size: 10px; font-weight: 300; letter-spacing: 0.1em; text-transform: uppercase; color: #d8d8d8; }

  .legend { padding: 16px 32px; border-top: 1px solid #d8d8d8; }
  .legend-row { display: table; width: 100%; }
  .legend-item { display: table-cell; padding-right: 24px; }
  .legend-inner { font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: #888; }
  .swatch { display: inline-block; width: 12px; height: 12px; vertical-align: middle; margin-right: 6px; }
  .swatch.suitable { background: #0a0a0a; }
  .swatch.conditional { border: 1.5px solid #0a0a0a; border-left-width: 3px; }

  .footer { padding: 20px 32px; font-size: 10px; font-weight: 300; letter-spacing: 0.08em; text-transform: uppercase; color: #888; border-top: 2px solid #0a0a0a; }
  .footer a { color: #0a0a0a; }
</style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <div class="header-left">
      <div class="title">Was kann<br>ich essen</div>
    </div>
    <div class="header-right">
      <div class="kw-badge">KW ${kw}</div>
      <div class="meta">Jena · 3 Mensen<br>vegan · glutenfrei</div>
    </div>
  </div>
`;

  week.forEach((dayMensen, i) => {
    if (!dayMensen[0]) return;
    const { day, month } = parseDateParts(dayMensen[0].date);
    const empty = dayMensen.every((m) => m.meals.length === 0);

    html += `<div class="day-row">`;
    html += `<div class="day-label"><span class="day-name">${WEEKDAYS[i]}</span><span class="day-number">${day}</span><span class="day-month">${month}</span></div>`;

    if (empty) {
      html += `<div class="day-nichts">nichts :/</div>`;
    } else {
      html += `<div class="mensen"><table style="width:100%;border-collapse:collapse"><tr>`;
      for (const name of MENSEN) {
        const data = dayMensen.find((m) => m.mensa === name) ?? { mensa: name, date: '', meals: [] };
        html += `<td class="mensa-col"><div class="mensa-label">${name}</div>`;
        const DINNER_CATS = ['abendessen', 'abendmensa', 'abend'];
        const lunchMeals = data.meals.filter(m => !DINNER_CATS.some(c => m.category.toLowerCase().includes(c)));
        const dinnerMeals = data.meals.filter(m => DINNER_CATS.some(c => m.category.toLowerCase().includes(c)));

        if (lunchMeals.length === 0 && dinnerMeals.length === 0) {
          html += `<div class="empty">–</div>`;
        } else {
          lunchMeals.forEach(meal => { html += renderMeal(meal); });
          if (dinnerMeals.length > 0) {
            html += `<div class="dinner-block"><div class="dinner-label">Abend</div><div class="dinner-meals">`;
            dinnerMeals.forEach(meal => { html += renderMeal(meal); });
            html += `</div></div>`;
          }
        }
        html += `</td>`;
      }
      html += `</tr></table></div>`;
    }

    html += `</div>`;
  });

  html += `
  <div class="legend">
    <table class="legend-row"><tr>
      <td class="legend-item"><span class="legend-inner"><span class="swatch suitable"></span>vegan &amp; glutenfrei</span></td>
      <td class="legend-item"><span class="legend-inner"><span class="swatch conditional"></span>geeignet, Beilage weglassen</span></td>
    </tr></table>
  </div>

  <div class="footer">
    Jena · stw-thueringen.de &nbsp;·&nbsp; <a href="${url}">${url.replace('https://', '')}</a>
  </div>

</div>
</body>
</html>`;

  return html;
}

function buildText(week: FilteredMensaDay[][]): string {
  const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
  let text = 'Was kann ich essen – vegan & glutenfrei\n\n';

  week.forEach((dayMensen, i) => {
    if (!dayMensen[0]) return;
    text += `\n${WEEKDAYS[i]}, ${formatDate(dayMensen[0].date)}\n${'─'.repeat(40)}\n`;

    const hasMeals = dayMensen.some((m) => m.meals.length > 0);
    if (!hasMeals) { text += 'nichts :/\n'; return; }

    const DINNER_CATS = ['abendessen', 'abendmensa', 'abend'];
    for (const mensa of dayMensen) {
      if (mensa.meals.length === 0) continue;
      text += `\n${mensa.mensa}:\n`;
      const lunch = mensa.meals.filter(m => !DINNER_CATS.some(c => m.category.toLowerCase().includes(c)));
      const dinner = mensa.meals.filter(m => DINNER_CATS.some(c => m.category.toLowerCase().includes(c)));
      for (const meal of lunch) {
        const icon = meal.status === 'suitable' ? '✓' : '~';
        text += `  ${icon} ${meal.title}`;
        if (meal.skipComponents.length > 0) text += ` (ohne: ${meal.skipComponents.join(', ')})`;
        if (meal.containsHafer) text += ` [enthält Hafer]`;
        if (meal.priceStudent) text += `  ${meal.priceStudent}`;
        text += '\n';
      }
      if (dinner.length > 0) {
        text += `  Abend:\n`;
        for (const meal of dinner) {
          const icon = meal.status === 'suitable' ? '✓' : '~';
          text += `    ${icon} ${meal.title}`;
          if (meal.skipComponents.length > 0) text += ` (ohne: ${meal.skipComponents.join(', ')})`;
          if (meal.containsHafer) text += ` [enthält Hafer]`;
          if (meal.priceStudent) text += `  ${meal.priceStudent}`;
          text += '\n';
        }
      }
    }
  });

  const url = process.env.NEXT_PUBLIC_URL || 'https://waskannichessen.vercel.app';
  text += `\n${url}\n`;
  return text;
}
