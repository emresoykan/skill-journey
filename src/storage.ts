import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis } from './skillEngine';
import { renameLegacyHabit, type Habit, type HabitCounts, type Measure, type MeasureValues } from './routines';
import type { Learning, Reviews, ReviewState } from './learning';
import { isTodo, parseTodos, pruneTodos, type Todo } from './todos';
import { addQuarantine, parseQuarantine, type QuarantineItem } from './backup';
import { parseEntries, splitArray, splitRecord } from './storageSafety';

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

// Bozuk JSON silinmez: karantinaya alınır ve anahtar boş sayılır.
async function readJson(key: string): Promise<unknown> {
  const stored = await AsyncStorage.getItem(key);
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
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
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
  await AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));
}

const isReviewState = (state: unknown): state is ReviewState =>
  !!state && Number.isInteger((state as ReviewState).stage) && typeof (state as ReviewState).due === 'string';

export async function loadReviews(): Promise<Reviews> {
  const { items, rejected } = splitRecord(await readJson(REVIEWS_KEY), isReviewState);
  await keepRejected(REVIEWS_KEY, rejected);
  return items;
}

export async function saveReviews(reviews: Reviews): Promise<void> {
  await AsyncStorage.setItem(REVIEWS_KEY, JSON.stringify(reviews));
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
  await AsyncStorage.setItem(HABIT_COUNTS_KEY, JSON.stringify(counts));
}

export async function loadTodos(): Promise<Todo[]> {
  const { items, rejected } = splitArray(await readJson(TODOS_KEY), isTodo);
  await keepRejected(TODOS_KEY, rejected);
  return pruneTodos(parseTodos(items));
}

export async function saveTodos(todos: Todo[]): Promise<void> {
  await AsyncStorage.setItem(TODOS_KEY, JSON.stringify(todos));
}
