import { entryXp } from './game';
import type { Entry } from './storage';

export type Period = 'daily' | 'weekly' | 'monthly';
export type ChartPoint = { key: string; label: string; xp: number };

const windows: Record<Period, number> = { daily: 7, weekly: 8, monthly: 6 };

function periodStart(date: Date, period: Period): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (period === 'weekly') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  if (period === 'monthly') start.setDate(1);
  return start;
}

function shiftPeriod(date: Date, period: Period, amount: number): Date {
  if (period === 'monthly') return new Date(date.getFullYear(), date.getMonth() + amount, 1);
  const shifted = new Date(date);
  shifted.setDate(shifted.getDate() + amount * (period === 'weekly' ? 7 : 1));
  return shifted;
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function getChartPoints(entries: Entry[], period: Period, now = new Date()): ChartPoint[] {
  const current = periodStart(now, period);
  const first = shiftPeriod(current, period, 1 - windows[period]);
  const points = Array.from({ length: windows[period] }, (_, index) => {
    const date = shiftPeriod(first, period, index);
    const label = period === 'monthly'
      ? new Intl.DateTimeFormat('tr-TR', { month: 'short' }).format(date)
      : period === 'weekly'
        ? new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'numeric' }).format(date)
        : new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(date);
    return { key: dayKey(date), label, xp: 0 };
  });
  const byKey = new Map(points.map(point => [point.key, point]));
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    if (!Number.isFinite(date.getTime())) continue;
    const point = byKey.get(dayKey(periodStart(date, period)));
    if (point) point.xp += entryXp(entry);
  }
  return points;
}
