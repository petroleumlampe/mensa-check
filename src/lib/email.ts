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
    subject: `Mensaplan KW ${kw} – vegane & glutenfreie Gerichte`,
    html: buildHtml(week),
    text: buildText(week),
  });
}

function buildHtml(week: FilteredMensaDay[][]): string {
  let body = `
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;color:#222">
      <h2 style="color:#2d6a4f;margin-bottom:4px">Mensa-Check</h2>
      <p style="color:#666;margin-top:0">vegane &amp; glutenfreie Gerichte diese Woche</p>
  `;

  for (const dayMensen of week) {
    if (!dayMensen[0]) continue;
    const date = dayMensen[0].date;
    const hasMeals = dayMensen.some((m) => m.meals.length > 0);

    body += `<h3 style="color:#52796f;border-bottom:1px solid #d1e7dd;padding-bottom:4px;margin-top:24px">${formatDate(date)}</h3>`;

    if (!hasMeals) {
      body += `<p style="color:#999;margin:4px 0">Nichts Geeignetes.</p>`;
      continue;
    }

    for (const mensa of dayMensen) {
      if (mensa.meals.length === 0) continue;
      body += `<p style="margin:8px 0 4px;font-weight:bold">${mensa.mensa}</p><ul style="margin:0;padding-left:20px">`;
      for (const meal of mensa.meals) {
        const icon = meal.status === 'suitable' ? '✅' : '⚠️';
        body += `<li style="margin:4px 0">${icon} ${meal.title}`;
        if (meal.skipComponents.length > 0) {
          body += ` <span style="color:#888;font-size:0.85em">(weglassen: ${meal.skipComponents.join(', ')})</span>`;
        }
        body += ` <span style="color:#aaa;font-size:0.8em">[${meal.category}]</span></li>`;
      }
      body += '</ul>';
    }
  }

  body += `<p style="color:#aaa;font-size:0.8em;margin-top:32px">Quelle: stw-thueringen.de · <a href="${process.env.NEXT_PUBLIC_URL || 'https://mensa-check.vercel.app'}">Website öffnen</a></p></div>`;
  return body;
}

function buildText(week: FilteredMensaDay[][]): string {
  let text = 'Mensa-Check – vegane & glutenfreie Gerichte\n\n';

  for (const dayMensen of week) {
    if (!dayMensen[0]) continue;
    text += `\n${formatDate(dayMensen[0].date)}\n${'─'.repeat(40)}\n`;

    const hasMeals = dayMensen.some((m) => m.meals.length > 0);
    if (!hasMeals) { text += 'Nichts Geeignetes.\n'; continue; }

    for (const mensa of dayMensen) {
      if (mensa.meals.length === 0) continue;
      text += `\n${mensa.mensa}:\n`;
      for (const meal of mensa.meals) {
        const icon = meal.status === 'suitable' ? '✅' : '⚠️';
        text += `  ${icon} ${meal.title}`;
        if (meal.skipComponents.length > 0) text += ` (weglassen: ${meal.skipComponents.join(', ')})`;
        text += '\n';
      }
    }
  }
  return text;
}
