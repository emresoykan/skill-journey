// Haftalık değerlendirme: yalnız kayıtlardan; her öneri gerekçesiyle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weeklyReview } from '../src/weeklyReview.ts';

const now = new Date(2026, 10, 14, 18);
const at = daysAgo => new Date(2026, 10, 14 - daysAgo, 10).toISOString();
let n = 0;
const entry = (daysAgo, awards, extra = {}) => ({ id: `e${n++}`, createdAt: at(daysAgo), description: extra.description ?? `kayıt ${n}`, skill: awards[0][0], xp: awards.reduce((s, a) => s + a[1], 0), reason: 'r', awards: awards.map(([skill, xp]) => ({ skill, xp })), ...extra });

const entries = [
  // önceki 4 hafta: Fitness düzenli
  entry(20, [['Fitness', 15]]), entry(16, [['Fitness', 15]]), entry(14, [['Fitness', 15]]),
  // geçen hafta (7–13 gün önce)
  entry(9, [['Learning', 10]]), entry(8, [['Communication', 15]]), entry(7, [['Fitness', 15]]),
  // bu hafta (0–6 gün önce)
  entry(6, [['Cash Flow Forecasting', 30], ['Analytical Thinking', 15]], { depth: 'produced', description: 'Nakit akış tahminini hazırladım' }),
  entry(3, [['Communication', 15]], { depth: 'practiced' }),
  entry(3, [['Mindfulness', 10]], { habitId: 'h1' }),
  entry(1, [['Learning', 12]], { learning: { term: 'Opsiyon', meaning: 'hak' }, depth: 'learned' }),
  entry(0, [['Learning', 8]], { review: { count: 2 } }),
];

test('hafta ve önceki hafta sayıları', () => {
  const r = weeklyReview(entries, now);
  assert.equal(r.start, '2026-11-08');
  assert.equal(r.end, '2026-11-14');
  assert.equal(r.entries, 5);
  assert.equal(r.prevEntries, 3);
  assert.deepEqual(r.breakdown, { moments: 2, habits: 1, learnings: 1, reviews: 1 });
  assert.equal(r.xp, 90);
  assert.equal(r.prevXp, 40);
  assert.equal(r.activeDays, 4);
  assert.equal(r.prevActiveDays, 3);
  assert.equal(r.learned, 1);
  assert.equal(r.recalled, 2);
});

test('yeni beceriler ve en çok çalışılanlar', () => {
  const r = weeklyReview(entries, now);
  assert.deepEqual(r.newSkills.map(s => s.skill).sort(), ['Analytical Thinking', 'Cash Flow Forecasting', 'Mindfulness']);
  assert.equal(r.newSkills.find(s => s.skill === 'Cash Flow Forecasting').description, 'Nakit akış tahminini hazırladım');
  assert.equal(r.topSkills[0].skill, 'Cash Flow Forecasting');
});

test('derinlik dağılımı yeni motorla oluşan kayıtlardan', () => {
  assert.deepEqual(weeklyReview(entries, now).depths.map(d => [d.depth, d.count]), [['learned', 1], ['practiced', 1], ['produced', 1]]);
});

test('kilometre taşları: seviye ve rozet', () => {
  const r = weeklyReview(entries, now, { first: '', entries5: at(2), streak3: at(12) });
  assert.ok(r.milestones.includes("Seviye 2'ye ulaştın"), r.milestones.join(' | '));
  assert.ok(r.milestones.some(m => m.includes('Günlükçü')), 'bu hafta kazanılan rozet');
  assert.ok(!r.milestones.some(m => m.includes('Kıvılcım')), 'önceki haftanın rozeti sayılmaz');
  assert.ok(!r.milestones.some(m => m.includes('İlk Adım')), 'tarihi bilinmeyen rozet sayılmaz');
});

test('bu hafta ihmal edilen alan ve gerekçeli öneriler', () => {
  const r = weeklyReview(entries, now, {}, 3);
  assert.deepEqual(r.quietDomains, [{ domain: 'Sağlık ve Hareket', earlier: 4 }]);
  assert.ok(r.suggestions.length <= 3);
  assert.ok(r.suggestions.every(s => s.text && s.reason));
  assert.match(r.suggestions[0].reason, /3 kavramın tekrar günü/);
  assert.match(r.suggestions[1].reason, /Önceki 4 haftada bu alanda 4 kayıt/);
});

test('boş hafta: uydurma veri yok, tek öneri', () => {
  const r = weeklyReview([], now);
  assert.equal(r.entries, 0);
  assert.deepEqual([r.newSkills, r.topSkills, r.milestones, r.quietDomains, r.depths], [[], [], [], [], []]);
  assert.equal(r.suggestions.length, 1);
  assert.match(r.suggestions[0].reason, /hiç kayıt yok/);
});

test('derin kayıt yoksa öneri, varsa yok', () => {
  const shallow = [0, 1, 2].map(d => entry(d, [['Fitness', 15]], { depth: 'practiced' }));
  assert.ok(weeklyReview(shallow, now).suggestions.some(s => s.reason.includes('ürettin')));
  assert.ok(!weeklyReview(entries, now).suggestions.some(s => s.reason.includes('ürettin')));
});
