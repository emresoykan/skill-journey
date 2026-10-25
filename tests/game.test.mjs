// Seri, gün gruplama, seviye ve rozet kuralları.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { badgeProgress, getStreak, groupByDay, level, longestStreak, newlyUnlocked, todayEntries, totalXpOf, withEarnedBadges } from '../src/game.ts';
import { dayKey } from '../src/dates.ts';

let n = 0;
const entry = (createdAt, extra = {}) => ({ id: `e${n++}`, createdAt, description: 'x', skill: 'Learning', xp: 10, reason: 'r', awards: [{ skill: 'Learning', xp: 10 }], ...extra });
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString();

test('seviye eşikleri: her 100 XP bir seviye', () => {
  assert.equal(level(0), 1);
  assert.equal(level(99), 1);
  assert.equal(level(100), 2);
  assert.equal(level(250), 3);
});

test('toplam XP görev bonusunu da sayar; silinen kayıt toplamdan düşer', () => {
  const list = [entry(at(2026, 10, 20)), entry(at(2026, 10, 21), { bonusXp: 20 })];
  assert.equal(totalXpOf(list), 40);
  assert.equal(totalXpOf(list.slice(1)), 30);
});

test('seri: bugün kayıt yoksa dünden sayılır, ara verince sıfırlanır ama ceza yok', () => {
  const now = new Date(2026, 9, 25, 9);
  const list = [entry(at(2026, 10, 22)), entry(at(2026, 10, 23)), entry(at(2026, 10, 24))];
  assert.deepEqual([getStreak(list, now).count, getStreak(list, now).activeToday], [3, false]);
  assert.equal(getStreak([...list, entry(at(2026, 10, 25))], now).count, 4);
  assert.equal(getStreak(list, new Date(2026, 9, 27)).count, 0);
  assert.equal(totalXpOf(list), 30, 'ara vermek XP düşürmez');
  assert.equal(getStreak(list, now).week.length, 7);
});

test('en uzun seri yaz saati geçişini kesintisiz sayar', () => {
  const list = [entry(at(2026, 10, 24)), entry(at(2026, 10, 25)), entry(at(2026, 10, 26)), entry(at(2026, 10, 28))];
  assert.equal(longestStreak(list), 3);
});

test('başka saat diliminde yazılan kayıt kendi gününde gruplanır', () => {
  // New York'ta 24 Ekim 20:00 = İstanbul'da 25 Ekim 03:00. Kayıt New York'ta yazıldı → 24 Ekim.
  const ny = entry('2026-10-25T00:00:00.000Z', { tz: 'America/New_York' });
  const groups = groupByDay([ny]);
  assert.equal(groups[0].key, '2026-10-24');
  assert.equal(todayEntries([ny], new Date(2026, 9, 24, 12)).length, dayKey(new Date(2026, 9, 24, 12)) === '2026-10-24' ? 1 : 0);
});

test('geçersiz tarihli kayıt gruplamayı ve seriyi bozmaz', () => {
  const list = [entry('bozuk'), entry(at(2026, 10, 24))];
  assert.equal(groupByDay(list).length, 1);
  assert.equal(longestStreak(list), 1);
});

test('rozet: kazanılan rozet kayıt silinse de açık kalır ve yeniden kutlanmaz', () => {
  const first = [entry(at(2026, 10, 24))];
  assert.ok(badgeProgress(first).find(b => b.id === 'first').unlocked);
  assert.ok(!badgeProgress([]).find(b => b.id === 'first').unlocked);
  const earned = withEarnedBadges(first, {}, '');
  assert.deepEqual(earned, { first: '' });
  assert.ok(badgeProgress([], earned).find(b => b.id === 'first').unlocked, 'silindikten sonra da açık');
  assert.deepEqual(newlyUnlocked([], first, earned).map(b => b.id), [], 'tekrar kutlanmaz');
  assert.deepEqual(newlyUnlocked([], first).map(b => b.id), ['first'], 'ilk kez kazanılınca kutlanır');
  assert.equal(withEarnedBadges(first, earned, 'x'), null, 'değişiklik yoksa null');
});

test('rozet koşulları: kayıt sayısı, beceri çeşidi, kombo', () => {
  const skills = ['Learning', 'Fitness', 'Music'].map((skill, i) => entry(at(2026, 10, 20 + i), { skill, awards: [{ skill, xp: 10 }] }));
  const combo = entry(at(2026, 10, 24), { awards: [{ skill: 'A', xp: 5 }, { skill: 'B', xp: 5 }, { skill: 'C', xp: 5 }] });
  const unlocked = new Set(badgeProgress([...skills, combo]).filter(b => b.unlocked).map(b => b.id));
  for (const id of ['first', 'skills3', 'combo', 'streak3']) assert.ok(unlocked.has(id), id);
  assert.ok(!unlocked.has('entries5'));
});
