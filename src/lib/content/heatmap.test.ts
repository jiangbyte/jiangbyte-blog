import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bucketPostsByDay, buildYearHeatmap, dailyPeak } from './heatmap';

const post = (date: string) => ({ data: { date: new Date(date) } });

test('day buckets follow the site timezone across midnight', () => {
  const counts = bucketPostsByDay(
    [post('2023-12-31T15:59:59Z'), post('2023-12-31T16:00:00Z'), post('2023-12-31T16:00:00Z')],
    'Asia/Shanghai',
  );
  assert.equal(counts.get('2023-12-31'), 1);
  assert.equal(counts.get('2024-01-01'), 2);
  assert.equal(dailyPeak(counts), 2);
});

test('year heatmap is Monday-first and pads partial weeks', () => {
  const counts = new Map([['2024-01-01', 3]]);
  const heat = buildYearHeatmap(2024, counts, '2024-06-15', 3);
  // 2024-01-01 was Monday → first week starts on that day
  assert.equal(heat.weeks[0]?.days[0]?.key, '2024-01-01');
  assert.equal(heat.weeks[0]?.days[0]?.count, 3);
  assert.equal(heat.weeks[0]?.days[0]?.tier, 4);
  assert.deepEqual(heat.monthLabels[0], { month: 1, weekIndex: 0 });
  // Future day in June stays tier 0 with future flag
  const june16 = heat.weeks.flatMap((w) => w.days).find((d) => d.key === '2024-06-16');
  assert.ok(june16);
  assert.equal(june16.future, true);
  assert.equal(june16.tier, 0);
});
