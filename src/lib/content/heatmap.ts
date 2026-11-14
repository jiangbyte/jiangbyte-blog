import { formatInTimeZone } from 'date-fns-tz';
import { monthIntensity } from './index-groups';

type DatedPost = { data: { date: Date } };

export type HeatmapDay = {
  /** yyyy-MM-dd in the site timezone */
  key: string;
  year: number;
  month: number;
  day: number;
  /** Monday = 0 … Sunday = 6 */
  dow: number;
  count: number;
  tier: number;
  /** After today — not yet written */
  future: boolean;
  /** Padding cells outside the calendar year */
  outside: boolean;
};

export type HeatmapWeek = { days: HeatmapDay[] };

export type HeatmapMonthLabel = {
  /** 1–12 */
  month: number;
  /** Column index in `weeks` where the label sits */
  weekIndex: number;
};

export type YearHeatmap = {
  year: number;
  weeks: HeatmapWeek[];
  monthLabels: HeatmapMonthLabel[];
};

/** UTC calendar-date helpers — keys are civil dates, not instants. */
function ymdParts(key: string): { y: number; m: number; d: number } {
  return { y: Number(key.slice(0, 4)), m: Number(key.slice(5, 7)), d: Number(key.slice(8, 10)) };
}

function toKey(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function addDaysKey(key: string, delta: number): string {
  const { y, m, d } = ymdParts(key);
  const utc = new Date(Date.UTC(y, m - 1, d + delta));
  return toKey(utc.getUTCFullYear(), utc.getUTCMonth() + 1, utc.getUTCDate());
}

/** Monday = 0 … Sunday = 6 (UTC weekday of the civil date). */
function mondayIndex(key: string): number {
  const { y, m, d } = ymdParts(key);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Count posts per civil day in the site timezone. */
export function bucketPostsByDay<T extends DatedPost>(posts: readonly T[], timezone: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    const key = formatInTimeZone(post.data.date, timezone, 'yyyy-MM-dd');
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/**
 * GitHub-style contribution grid for one calendar year (Monday-first columns).
 * Padding days outside the year fill partial first/last weeks.
 */
export function buildYearHeatmap(year: number, dayCounts: Map<string, number>, todayKey: string, peak: number): YearHeatmap {
  // 1. 以该年首尾为界，向两侧补齐到周一 / 周日
  const yearStart = toKey(year, 1, 1);
  const yearEnd = toKey(year, 12, 31);
  const gridStart = addDaysKey(yearStart, -mondayIndex(yearStart));
  const gridEnd = addDaysKey(yearEnd, 6 - mondayIndex(yearEnd));

  // 2. 按周切成列；每天算强度与是否未来 / 年外
  const weeks: HeatmapWeek[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const days: HeatmapDay[] = [];
    for (let dow = 0; dow < 7; dow++) {
      const key = cursor;
      const { y, m, d } = ymdParts(key);
      const outside = key < yearStart || key > yearEnd;
      const count = outside ? 0 : (dayCounts.get(key) ?? 0);
      const future = !outside && key > todayKey;
      days.push({
        key,
        year: y,
        month: m,
        day: d,
        dow,
        count,
        tier: future || outside ? 0 : monthIntensity(count, peak),
        future,
        outside,
      });
      cursor = addDaysKey(cursor, 1);
    }
    weeks.push({ days });
  }

  // 3. 月标签落在「该月 1 号所在列」
  const monthLabels: HeatmapMonthLabel[] = [];
  for (let month = 1; month <= 12; month++) {
    const first = toKey(year, month, 1);
    const weekIndex = weeks.findIndex((week) => week.days.some((day) => day.key === first));
    if (weekIndex >= 0) monthLabels.push({ month, weekIndex });
  }

  return { year, weeks, monthLabels };
}

/** Peak daily count across years, used so multi-year heatmaps share one intensity scale. */
export function dailyPeak(dayCounts: Map<string, number>): number {
  let peak = 0;
  for (const count of dayCounts.values()) if (count > peak) peak = count;
  return peak;
}
