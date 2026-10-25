// Gün hesabı: kayıt, yazıldığı saat dilimindeki gününde kalır.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDaysToKey, dayKey, dayKeyIn, daysBetweenKeys, entryDay, keyToDate } from '../src/dates.ts';

test('aynı an farklı saat dilimlerinde farklı günlere düşer', () => {
  const instant = new Date('2026-10-24T22:30:00Z');
  assert.equal(dayKeyIn(instant, 'Europe/Istanbul'), '2026-10-25');
  assert.equal(dayKeyIn(instant, 'America/New_York'), '2026-10-24');
  assert.equal(dayKeyIn(instant, 'Asia/Tokyo'), '2026-10-25');
});

test('saat dilimi yoksa ya da tanınmıyorsa cihazın yerel günü', () => {
  const instant = new Date('2026-10-24T10:00:00Z');
  assert.equal(dayKeyIn(instant), dayKey(instant));
  assert.equal(dayKeyIn(instant, 'Mars/Olympus'), dayKey(instant));
  assert.equal(entryDay({ createdAt: instant.toISOString() }), dayKey(instant));
});

test('kaydın günü saat dilimine sabit', () => {
  // İstanbul'da 25 Ekim 01:30'da yazılmış kayıt; cihaz hangi saat diliminde olursa olsun 25 Ekim'dir.
  assert.equal(entryDay({ createdAt: '2026-10-24T22:30:00.000Z', tz: 'Europe/Istanbul' }), '2026-10-25');
});

test('gün aritmetiği ay sonu ve yaz saati geçişinde doğru', () => {
  assert.equal(addDaysToKey('2026-10-31', 1), '2026-11-01');
  assert.equal(addDaysToKey('2026-03-01', -1), '2026-02-28');
  assert.equal(daysBetweenKeys('2026-03-28', '2026-03-30'), 2); // Avrupa'da yaz saati 29 Mart
  assert.equal(daysBetweenKeys('2026-10-24', '2026-10-26'), 2); // ve 25 Ekim
  assert.equal(dayKey(keyToDate('2026-10-25')), '2026-10-25');
});
