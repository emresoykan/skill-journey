// Gelişim ve Anılar hesapları: yalnız kayıtlardan türetilir.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoveriesByEntry, filterEntries, filterOptions, growingSkills, isLearningEntry, learningWeeks, newSkills, overview, skillSummaries } from '../src/insights.ts';

const now = new Date(2026, 10, 10, 12);
const at = (daysAgo, hour = 10) => new Date(2026, 10, 10 - daysAgo, hour).toISOString();
let n = 0;
const entry = (daysAgo, awards, extra = {}) => ({ id: `e${n++}`, createdAt: at(daysAgo), description: extra.description ?? 'kayıt', skill: awards[0][0], xp: awards.reduce((s, a) => s + a[1], 0), reason: 'r', awards: awards.map(([skill, xp]) => ({ skill, xp })), ...extra });

const entries = [
  entry(60, [['Learning', 10]], { description: 'Eski öğrenme' }),
  entry(20, [['Cash Flow Forecasting', 30], ['Analytical Thinking', 15]], { description: 'Nakit akış tahmini hazırladım' }),
  entry(5, [['Fitness', 15]], { description: 'Akşam koştum' }),
  entry(1, [['Languages', 10]], { description: 'İngilizce kelime çalıştım' }),
  entry(0, [['Cash Flow Forecasting', 20]], { description: 'Nakit akışını güncelledim' }),
  entry(0, [['Learning', 12]], { description: 'Opsiyon — hak', learning: { term: 'Opsiyon', meaning: 'hak' } }),
];

test('beceri özetleri XP sırasıyla', () => {
  const list = skillSummaries(entries);
  assert.deepEqual(list[0], { skill: 'Cash Flow Forecasting', xp: 50, count: 2 });
  assert.equal(list.length, 5);
});

test('son 30 günde en çok gelişen beceriler (eski kayıt sayılmaz)', () => {
  assert.deepEqual(growingSkills(entries, now).map(s => s.skill), ['Cash Flow Forecasting', 'Analytical Thinking', 'Fitness']);
  assert.deepEqual(growingSkills(entries, now, 1).map(s => s.skill), ['Cash Flow Forecasting', 'Learning']);
});

test('yeni keşfedilen beceriler: ilk kaydı son 30 günde olanlar, en yeni önce', () => {
  assert.deepEqual(newSkills(entries, now).map(s => s.skill), ['Languages', 'Fitness', 'Cash Flow Forecasting', 'Analytical Thinking']);
  const first = discoveriesByEntry(entries);
  assert.deepEqual(first.get(entries[1].id), ['Cash Flow Forecasting', 'Analytical Thinking']);
  assert.equal(first.get(entries[4].id), undefined, 'ikinci nakit akış kaydı keşif değil');
});

test('öğrenme düzeni: haftalara göre öğrenme yapılan gün sayısı', () => {
  assert.ok(isLearningEntry(entries[3]), 'Yabancı Dil, Öğrenme alt becerisi');
  assert.ok(!isLearningEntry(entries[2]));
  const weeks = learningWeeks(entries, now);
  assert.equal(weeks.length, 4);
  assert.equal(weeks[3].days, 2, 'bu hafta: dün ve bugün');
  assert.deepEqual(weeks.slice(0, 3).map(w => w.days), [0, 0, 0]);
});

test('genel bakış sayıları', () => {
  assert.deepEqual(overview(entries, now), { entries: 6, skills: 5, activeDays: 5, longestStreak: 2, last7: 4, last30Days: 4 });
});

test('Anılar filtreleri: metin, tarih, beceri (alt becerileri dahil), alan', () => {
  assert.equal(filterEntries(entries, { query: 'NAKİT' }, now).length, 2);
  assert.equal(filterEntries(entries, { query: 'nakit tahmin' }, now).length, 2, 'beceri adı da aranır (Nakit Akış Tahmini)');
  assert.equal(filterEntries(entries, { query: 'nakit hazırladım' }, now).length, 1);
  assert.equal(filterEntries(entries, { range: 'week' }, now).length, 4);
  assert.equal(filterEntries(entries, { range: 'month' }, now).length, 5);
  assert.equal(filterEntries(entries, { skill: 'Learning' }, now).length, 3, 'Yabancı Dil de Öğrenme sayılır');
  assert.equal(filterEntries(entries, { skill: 'Finance' }, now).length, 2);
  assert.equal(filterEntries(entries, { domain: 'Finans' }, now).length, 2);
  assert.equal(filterEntries(entries, { domain: 'Finans', range: 'week' }, now).length, 1);
  assert.equal(filterEntries(entries, {}, now).length, entries.length);
});

test('filtre seçenekleri yalnız kayıtlarda geçenlerden', () => {
  const options = filterOptions([...entries, entry(0, [['Satranç', 10]])]);
  assert.ok(options.skills.includes('Satranç'));
  assert.deepEqual(options.domains, ['Kariyer ve İş', 'Finans', 'Öğrenme', 'Sağlık ve Hareket', 'Kendi becerilerin']);
});
