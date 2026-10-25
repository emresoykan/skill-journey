import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis } from './skillEngine';
import { renameLegacyHabit, type Habit, type HabitCounts, type Measure, type MeasureValues } from './routines';
import type { Learning, Reviews, ReviewState } from './learning';
import { isTodo, parseTodos, pruneTodos, type Todo } from './todos';
import { addQuarantine, parseQuarantine, type QuarantineItem } from './backup';
import { parseEntries, splitArray, splitRecord } from './storageSafety';
import { parseSchemaVersion, pendingMigrations } from './migrations';

// bonusXp: günlük görevden gelen ek XP; beceriye değil toplam XP'ye eklenir.
// habitId: kayıt bir rutine tik atılarak oluştuysa o rutinin kimliği.
// measures: rutin tikiyle girilen ölçüler (adım, dakika, sayfa).
// learning: "Öğrendiklerim" kaydının kavramı ve anlamı. review: günün tekrar oturumu (kaç kavram hatırlandı).
// tz: kaydın yazıldığı IANA saat dilimi (yeni kayıtlarda).
export type Entry = Analysis & { id: string; createdAt: string; tz?: string; description: string; bonusXp?: number; habitId?: string; measures?: MeasureValues; learning?: Learning; review?: { count: number } };
const KEY = 'skill-journey:entries:v1';
const HABITS_KEY = 'skill-journey:habits:v1';
const REVIEWS_KEY = 'skill-journey:reviews:v1';
const HABIT_COUNTS_KEY = 'skill-journey:habit-counts:v1';
const TODOS_KEY = 'skill-journey:todos:v1';
export const QUARANTINE_KEY = 'skill-journey:quarantine:v1';
const BADGES_KEY = 'skill-journey:badges:v1';
const META_KEY = 'skill-journey:meta:v1';
const SNAPSHOT_KEY = 'skill-journey:snapshot:v1';
const MEASURES: Measure[] = ['steps', 'duration', 'pages'];

export async function loadQuarantine(): Promise<QuarantineItem[]> {
  const stored = await AsyncStorage.getItem(QUARANTINE_KEY);
  if (!stored) return [];
  try { return parseQuarantine(JSON.parse(stored)); } catch { return []; }
}

// Okunamayan veriyi ham haliyle ayırır. Bu yazılamazsa hata fırlatır; o zaman veri yüklenmemiş sayılır
// ve üzerine yazılmaz (bkz. journey-state'teki hazır olma kontrolü).
async function quarantine(key: string, raw: string) {
  const list = await loadQuarantine();
  const next = addQuarantine(list, { key, at: new Date().toISOString(), raw });
  if (next !== list) await AsyncStorage.setItem(QUARANTINE_KEY, JSON.stringify(next));
}

// Her anahtarın bu sekmede en son okunan ya da yazılan ham hali. Yazmadan önce diskteki hal bununla
// karşılaştırılır: farklıysa veri bu arada başka bir sekmede değişmiştir ve üzerine yazılmaz.
const known = new Map<string, string | null>();

export class StorageConflictError extends Error {
  constructor(key: string) { super(`${key} başka bir sekmede değişti`); this.name = 'StorageConflictError'; }
}

async function writeJson(key: string, value: unknown) {
  const raw = JSON.stringify(value);
  if (known.has(key) && (await AsyncStorage.getItem(key)) !== known.get(key)) throw new StorageConflictError(key);
  await AsyncStorage.setItem(key, raw);
  known.set(key, raw);
}

// Bozuk JSON silinmez: karantinaya alınır ve anahtar boş sayılır.
async function readJson(key: string): Promise<unknown> {
  const stored = await AsyncStorage.getItem(key);
  known.set(key, stored);
  if (!stored) return undefined;
  try { return JSON.parse(stored); } catch { await quarantine(key, stored); return undefined; }
}

async function keepRejected(key: string, rejected: unknown[]) {
  if (rejected.length) await quarantine(key, JSON.stringify(rejected));
}

export async function loadEntries(): Promise<Entry[]> {
  const { entries, rejected } = parseEntries(await readJson(KEY));
  await keepRejected(KEY, rejected);
  return entries;
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  await writeJson(KEY, entries);
}

const isHabit = (habit: unknown): habit is Habit => !!habit && typeof habit === 'object'
  && ['id', 'title', 'icon', 'skill', 'createdAt'].every(key => typeof (habit as Record<string, unknown>)[key] === 'string');

export async function loadHabits(): Promise<Habit[]> {
  const { items, rejected } = splitArray(await readJson(HABITS_KEY), isHabit);
  await keepRejected(HABITS_KEY, rejected);
  return items
    .map(renameLegacyHabit)
    .map(habit => ({ ...habit, target: Number.isInteger(habit.target) && habit.target! >= 1 ? habit.target : undefined, unit: typeof habit.unit === 'string' && habit.unit.trim() ? habit.unit : undefined,
      goalMinutes: Number.isInteger(habit.goalMinutes) && habit.goalMinutes! > 0 ? habit.goalMinutes : undefined,
      measures: Array.isArray(habit.measures) ? habit.measures.filter((m: unknown): m is Measure => MEASURES.includes(m as Measure)) : undefined }));
}

export async function saveHabits(habits: Habit[]): Promise<void> {
  await writeJson(HABITS_KEY, habits);
}

const isReviewState = (state: unknown): state is ReviewState =>
  !!state && Number.isInteger((state as ReviewState).stage) && typeof (state as ReviewState).due === 'string';

export async function loadReviews(): Promise<Reviews> {
  const { items, rejected } = splitRecord(await readJson(REVIEWS_KEY), isReviewState);
  await keepRejected(REVIEWS_KEY, rejected);
  return items;
}

export async function saveReviews(reviews: Reviews): Promise<void> {
  await writeJson(REVIEWS_KEY, reviews);
}

type HabitCount = HabitCounts[string];
const isHabitCount = (state: unknown): state is HabitCount =>
  !!state && typeof (state as HabitCount).day === 'string' && Number.isInteger((state as HabitCount).count) && (state as HabitCount).count >= 0;

export async function loadHabitCounts(): Promise<HabitCounts> {
  const { items, rejected } = splitRecord(await readJson(HABIT_COUNTS_KEY), isHabitCount);
  await keepRejected(HABIT_COUNTS_KEY, rejected);
  return items;
}

export async function saveHabitCounts(counts: HabitCounts): Promise<void> {
  await writeJson(HABIT_COUNTS_KEY, counts);
}

export async function loadTodos(): Promise<Todo[]> {
  const { items, rejected } = splitArray(await readJson(TODOS_KEY), isTodo);
  await keepRejected(TODOS_KEY, rejected);
  return pruneTodos(parseTodos(items));
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await writeJson(TODOS_KEY, todos);
}

// Kazanılan rozetler: rozet kimliği → kazanıldığı an (ISO). Boş metin: kalıcı kayıttan önce kazanılmış,
// tarihi bilinmiyor. Rozet bir kez kazanılınca kayıt silinse de geri alınmaz.
export type EarnedBadges = Record<string, string>;
const isEarnedAt = (value: unknown): value is string => typeof value === 'string';

export async function loadBadges(): Promise<EarnedBadges> {
  const { items, rejected } = splitRecord(await readJson(BADGES_KEY), isEarnedAt);
  await keepRejected(BADGES_KEY, rejected);
  return items;
}

export async function saveBadges(badges: EarnedBadges): Promise<void> {
  await writeJson(BADGES_KEY, badges);
}

// Bekleyen göçleri sırayla çalıştırır. Her göçten önce etkilenen anahtarların ham hali SNAPSHOT_KEY'e
// kopyalanır (son göçün öncesi saklanır). Bir göç hata verirse durur; sürüm ilerlemez, veri okumada
// onarılmaya devam eder. Çalışan göçlerin sürümlerini döner.
export async function runMigrations(): Promise<number[]> {
  const done: number[] = [];
  let version = parseSchemaVersion(await AsyncStorage.getItem(META_KEY));
  for (const migration of pendingMigrations(version)) {
    const data = Object.fromEntries(await AsyncStorage.multiGet(migration.keys));
    await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify({ beforeVersion: migration.version, at: new Date().toISOString(), data }));
    const changes = Object.entries(migration.run(data)).filter((pair): pair is [string, string] => typeof pair[1] === 'string' && pair[1] !== data[pair[0]]);
    if (changes.length) await AsyncStorage.multiSet(changes);
    version = migration.version;
    await AsyncStorage.setItem(META_KEY, JSON.stringify({ schemaVersion: version, migratedAt: new Date().toISOString() }));
    done.push(version);
  }
  return done;
}
