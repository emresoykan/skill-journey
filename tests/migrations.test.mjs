// Veri göçleri: silmez, tanımadığına dokunmaz, ikinci kez çalışınca değişiklik üretmez.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrations, parseSchemaVersion, pendingMigrations, SCHEMA_VERSION } from '../src/migrations.ts';

const ENTRIES = 'skill-journey:entries:v1';
const HABITS = 'skill-journey:habits:v1';
const v1 = migrations.find(m => m.version === 1);

test('göç 1: eski kayıtlara beceri listesi ekler, eski rutin adını taşır', () => {
  const entries = [
    { id: 'a', createdAt: 'x', description: 'eski', skill: 'Learning', xp: 12, reason: 'r' },
    { id: 'b', createdAt: 'x', description: 'yeni', skill: 'Music', xp: 15, reason: 'r', awards: [{ skill: 'Music', xp: 15 }] },
    { tanımsız: true },
  ];
  const habits = [{ id: 'h', title: '20 dk kitap oku', icon: '📖', skill: 'Learning', createdAt: 'x' }];
  const changes = v1.run({ [ENTRIES]: JSON.stringify(entries), [HABITS]: JSON.stringify(habits) });
  const outEntries = JSON.parse(changes[ENTRIES]);
  assert.equal(outEntries.length, 3, 'hiçbir öğe silinmez');
  assert.deepEqual(outEntries[0].awards, [{ skill: 'Learning', xp: 12 }]);
  assert.deepEqual(outEntries[1], entries[1]);
  assert.deepEqual(outEntries[2], { tanımsız: true }, 'tanımadığı öğeye dokunmaz');
  assert.equal(JSON.parse(changes[HABITS])[0].title, 'Kitap okuma');
});

test('göç 1 tekrarlanabilir: ikinci çalıştırmada değişiklik yok', () => {
  const data = { [ENTRIES]: JSON.stringify([{ id: 'a', skill: 'Learning', xp: 12 }]), [HABITS]: JSON.stringify([{ id: 'h', title: '20 dk kitap oku' }]) };
  const once = { ...data, ...v1.run(data) };
  assert.deepEqual(v1.run(once), {});
});

test('göç 1 okunamayan ya da boş veriye dokunmaz', () => {
  assert.deepEqual(v1.run({ [ENTRIES]: '[{"id":', [HABITS]: null }), {});
  assert.deepEqual(v1.run({ [ENTRIES]: '{"eski":"biçim"}' }), {});
});

test('sürüm bilgisi ve bekleyen göçler', () => {
  assert.equal(parseSchemaVersion(null), 0);
  assert.equal(parseSchemaVersion('bozuk'), 0);
  assert.equal(parseSchemaVersion(JSON.stringify({ schemaVersion: 1 })), 1);
  assert.deepEqual(pendingMigrations(0).map(m => m.version), migrations.map(m => m.version));
  assert.deepEqual(pendingMigrations(SCHEMA_VERSION), []);
  // Sürümler sıralı ve tekil.
  migrations.forEach((m, i) => assert.equal(m.version, i + 1));
});
