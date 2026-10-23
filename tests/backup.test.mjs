// Yedek dosyasının kurulup geri okunmasını sabitler.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_KEYS, backupFileName, buildBackup, parseBackup, restorePlan } from '../src/backup.ts';

const now = new Date(2026, 9, 23, 21, 5);
const entries = JSON.stringify([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
const habits = JSON.stringify([{ id: 'h1', title: 'Kitap okuma' }]);

test('yedek: kayıtlar ve rutinler gidip geri gelir, cihaza özgü anahtar girmez', () => {
  const text = buildBackup({ 'skill-journey:entries:v1': entries, 'skill-journey:habits:v1': habits, 'skill-journey:push-id': 'cihaz-123' }, now);
  assert.ok(!text.includes('cihaz-123'));
  const { backup, summary } = parseBackup(text);
  assert.equal(summary.entries, 3);
  assert.equal(summary.habits, 1);
  assert.equal(summary.exportedAt.getTime(), now.getTime());
  assert.equal(backup.data['skill-journey:entries:v1'], entries);
});

test('geri yükleme: yedekte olmayan anahtar silinir, veriler karışmaz', () => {
  const { backup } = parseBackup(buildBackup({ 'skill-journey:entries:v1': entries }, now));
  const plan = restorePlan(backup);
  assert.deepEqual(plan.set, [['skill-journey:entries:v1', entries]]);
  assert.deepEqual(plan.remove, BACKUP_KEYS.filter(key => key !== 'skill-journey:entries:v1'));
});

test('geçersiz dosyalar anlaşılır bir hatayla reddedilir', () => {
  assert.throws(() => parseBackup('merhaba'), /okunamadı/);
  assert.throws(() => parseBackup('{"format":"baska"}'), /Skill Journey yedeği değil/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'skill-journey-backup', version: 99, data: {} })), /daha yeni bir sürüm/);
  assert.throws(() => parseBackup(JSON.stringify({ format: 'skill-journey-backup', version: 1, data: { 'skill-journey:entries:v1': '{bozuk' } })), /bozuk/);
});

test('tarih bilgisi bozuk yedek yine okunur', () => {
  const { summary } = parseBackup(JSON.stringify({ format: 'skill-journey-backup', version: 1, exportedAt: 'x', data: {} }));
  assert.ok(Number.isNaN(summary.exportedAt.getTime()));
  assert.equal(summary.entries, 0);
});

test('dosya adı tarihi taşır', () => {
  assert.equal(backupFileName(now), 'skill-journey-yedek-2026-10-23.json');
});

// Kaynakta yeni bir saklama anahtarı eklenip yedeğe konmazsa bu test uyarır.
import { readdirSync, readFileSync } from 'node:fs';
const NOT_BACKED_UP = new Set(['skill-journey:push-id', 'skill-journey:push-synced', 'skill-journey:last-backup']);
test('kaynaktaki tüm veri anahtarları yedeğe giriyor', () => {
  const dir = new URL('../src/', import.meta.url);
  const keys = new Set(readdirSync(dir).filter(name => /\.tsx?$/.test(name))
    .flatMap(name => [...readFileSync(new URL(name, dir), 'utf8').matchAll(/'(skill-journey:[a-z-]+(?::v\d+)?)'/g)].map(match => match[1])));
  const missing = [...keys].filter(key => !NOT_BACKED_UP.has(key) && !BACKUP_KEYS.includes(key));
  assert.deepEqual(missing, []);
});
