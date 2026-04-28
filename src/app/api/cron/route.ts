import { NextResponse } from 'next/server';
import { getWeekDates } from '@/lib/dates';
import { fetchWeek } from '@/lib/scraper';
import { filterWeek } from '@/lib/filter';
import { sendWeeklyEmail } from '@/lib/email';

// Vercel Cron: "0 6 * * 1" — Montag 6:00 UTC (= 7:00 CET / 8:00 CEST)
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  // Protect the cron endpoint
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dates = getWeekDates();
  const raw = await fetchWeek(dates);
  const week = filterWeek(raw);

  await sendWeeklyEmail(week);

  const summary = week.flatMap((day) =>
    day.flatMap((mensa) =>
      mensa.meals.map((m) => `${mensa.date} ${mensa.mensa}: ${m.title}`)
    )
  );

  return NextResponse.json({ ok: true, count: summary.length, meals: summary });
}
