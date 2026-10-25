// Saklanan verinin sürüm göçleri. Her göç saf bir fonksiyondur: anahtarların ham JSON metnini alır,
// değişen anahtarları döner. Kural: göç hiçbir öğeyi silmez; tanımadığı ya da okuyamadığı veriye dokunmaz
// (okunamayan veri yüklemede karantinaya ayrılır). Çalışmadan önce etkilenen anahtarların kopyası alınır
// (bkz. storage.ts → runMigrations).
import { renameLegacyHabit } from './routines';

export type StoredValues = Record<string, string | null>;
export type Migration = { version: number; title: string; keys: string[]; run: (data: StoredValues) => StoredValues };

const ENTRIES = 'skill-journey:entries:v1';
const HABITS = 'skill-journey:habits:v1';

// Ham diziyi okur; okunamazsa ya da dizi değilse null (o anahtara dokunulmaz).
const readArray = (raw: string | null | undefined): unknown[] | null => {
  if (!raw) return null;
  try { const value: unknown = JSON.parse(raw); return Array.isArray(value) ? value : null; } catch { return null; }
};
const isRecord = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

export const migrations: Migration[] = [
  {
    version: 1,
    // Okumada her seferinde yapılan iki onarımı kalıcı yazar: awards'ı olmayan çok eski kayıtlara
    // tek beceri ekler, eski adlı hazır rutini yeni adına taşır.
    title: 'Eski kayıt ve rutin biçimlerini kalıcı olarak onar',
    keys: [ENTRIES, HABITS],
    run(data) {
      const changes: StoredValues = {};
      const entries = readArray(data[ENTRIES]);
      if (entries) {
        let changed = false;
        const repaired = entries.map(entry => {
          if (!isRecord(entry) || typeof entry.skill !== 'string' || typeof entry.xp !== 'number') return entry;
          if (Array.isArray(entry.awards) && entry.awards.length > 0) return entry;
          changed = true;
          return { ...entry, awards: [{ skill: entry.skill, xp: entry.xp }] };
        });
        if (changed) changes[ENTRIES] = JSON.stringify(repaired);
      }
      const habits = readArray(data[HABITS]);
      if (habits) {
        let changed = false;
        const renamed = habits.map(habit => {
          if (!isRecord(habit) || typeof habit.title !== 'string') return habit;
          const next = renameLegacyHabit(habit as { title: string });
          if (next !== habit) changed = true;
          return next;
        });
        if (changed) changes[HABITS] = JSON.stringify(renamed);
      }
      return changes;
    },
  },
];

export const SCHEMA_VERSION = migrations[migrations.length - 1]?.version ?? 0;

// Henüz çalışmamış göçler, sırayla. Sürüm bilgisi okunamıyorsa 0 sayılır: göçler zararsız ve
// tekrarlanabilir (aynı veride ikinci kez değişiklik üretmez) olacak şekilde yazılır.
export const pendingMigrations = (version: number) => migrations.filter(migration => migration.version > version);

export function parseSchemaVersion(raw: string | null | undefined): number {
  if (!raw) return 0;
  try {
    const value: unknown = JSON.parse(raw);
    return isRecord(value) && Number.isInteger(value.schemaVersion) && (value.schemaVersion as number) >= 0 ? value.schemaVersion as number : 0;
  } catch {
    return 0;
  }
}
