// Düzenlemenin XP'yi artıramadığını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { capAwards } from '../src/skillCorrections.ts';

const sum = awards => awards.reduce((total, award) => total + award.xp, 0);

test('toplam sınırın altındaysa beceriler aynen kalır', () => {
  const awards = [{ skill: 'Learning', xp: 8 }];
  assert.deepEqual(capAwards(awards, 11), awards);
});

test('toplam sınırı aşarsa ilk kazanılan XP ile sınırlanır', () => {
  const awards = [{ skill: 'Communication', xp: 14 }, { skill: 'Productivity', xp: 8 }];
  const capped = capAwards(awards, 11);
  assert.equal(sum(capped), 11);
  assert.deepEqual(capped.map(award => award.skill), ['Communication', 'Productivity']);
  assert.ok(capped.every(award => award.xp >= 1));
});

test('üç beceride de toplam tam olarak sınıra eşit olur', () => {
  const capped = capAwards([{ skill: 'A', xp: 18 }, { skill: 'B', xp: 17 }, { skill: 'C', xp: 11 }], 10);
  assert.equal(sum(capped), 10);
});
