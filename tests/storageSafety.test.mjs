import test from 'node:test';
import assert from 'node:assert/strict';
import { parseEntries, splitArray, splitRecord } from '../src/storageSafety.ts';
import { addQuarantine, buildBackup, mergeQuarantine, parseBackup, parseQuarantine, restorePlan } from '../src/backup.ts';

const entry = (id, extra = {}) => ({ id, createdAt: '2026-10-20T08:00:00.000Z', description: `kayıt ${id}`, skill: 'Learning', xp: 12, reason: 'r', awards: [{ skill: 'Learning', xp: 12 }], ...extra });

test('geçerli kayıtlar okunur, geçersizler silinmeden ayrılır', () => {
  const bad = { id: 'b', description: 'xp metin', skill: 'Learning', xp: '12', createdAt: '2026-10-20T08:00:00.000Z' };
  const { entries, rejected } = parseEntries([entry('a'), bad, null, entry('c')]);
  assert.deepEqual(entries.map(e => e.id), ['a', 'c']);
  assert.deepEqual(rejected, [bad, null]);
});

test('eski biçimdeki kayıt (awards yok) onarılır', () => {
  const { entries, rejected } = parseEntries([entry('a', { awards: undefined })]);
  assert.deepEqual(entries[0].awards, [{ skill: 'Learning', xp: 12 }]);
  assert.equal(rejected.length, 0);
});

test('dizi olmayan veri boş sayılır ama kaybolmaz', () => {
  assert.deepEqual(parseEntries(undefined), { entries: [], rejected: [] });
  assert.deepEqual(parseEntries({ eski: 'biçim' }), { entries: [], rejected: [{ eski: 'biçim' }] });
  assert.deepEqual(splitArray('metin', () => true), { items: [], rejected: ['metin'] });
});

test('kimlik → durum verisinde geçersiz ögeler ayrılır', () => {
  const valid = state => !!state && typeof state.day === 'string';
  const { items, rejected } = splitRecord({ a: { day: '2026-10-20' }, b: 5 }, valid);
  assert.deepEqual(items, { a: { day: '2026-10-20' } });
  assert.deepEqual(rejected, [{ b: 5 }]);
});

test('karantina aynı veriyi iki kez eklemez', () => {
  const item = { key: 'skill-journey:entries:v1', at: '2026-10-23T10:00:00.000Z', raw: '[{"id":' };
  const once = addQuarantine([], item);
  const twice = addQuarantine(once, { ...item, at: '2026-10-24T10:00:00.000Z' });
  assert.equal(twice, once);
  assert.equal(mergeQuarantine(once, [item, { ...item, raw: 'başka' }]).length, 2);
  assert.deepEqual(parseQuarantine([item, { key: 1 }]), [item]);
});

test('geri yükleme karantinayı silmez; cihazdaki ve yedektekini birleştirir', () => {
  const local = [{ key: 'skill-journey:entries:v1', at: 'x', raw: 'cihazdaki' }];
  const fromBackup = [{ key: 'skill-journey:habits:v1', at: 'y', raw: 'yedekteki' }];
  const { backup } = parseBackup(buildBackup({ 'skill-journey:entries:v1': '[]', 'skill-journey:quarantine:v1': JSON.stringify(fromBackup) }));
  const plan = restorePlan(backup, JSON.stringify(local));
  assert.ok(!plan.remove.includes('skill-journey:quarantine:v1'));
  const merged = JSON.parse(Object.fromEntries(plan.set)['skill-journey:quarantine:v1']);
  assert.deepEqual(merged.map(item => item.raw), ['cihazdaki', 'yedekteki']);
  // Karantinası olmayan eski yedek, cihazdakini silmez.
  const old = restorePlan(parseBackup(buildBackup({ 'skill-journey:entries:v1': '[]' })).backup, JSON.stringify(local));
  assert.ok(!old.remove.includes('skill-journey:quarantine:v1'));
  assert.equal(JSON.parse(Object.fromEntries(old.set)['skill-journey:quarantine:v1']).length, 1);
});
