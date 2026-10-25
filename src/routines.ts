// Günlük rutinlerin saf mantığı. Yalnız tip içe aktarır; npm test doğrudan çalıştırabilir.
import { addDaysToKey, dayKey as localDay, entryDay, isValidDate } from './dates';
import type { Analysis } from './skillEngine';
import type { Entry } from './storage';

// target: günde kaç kez (ör. 8 bardak su); yoksa tek tik. unit: sayının birimi ("bardak").
// measures: tik atarken sorulan ölçüler (ör. yürüyüşte adım ve süre). goalMinutes: süre ölçülü rutinde günlük süre hedefi.
export type Measure = 'steps' | 'duration' | 'pages';
export type MeasureValues = Partial<Record<Measure, number>>;
export type Habit = { id: string; title: string; icon: string; skill: string; createdAt: string; target?: number; unit?: string; measures?: Measure[]; goalMinutes?: number };
// aliases: önerinin eski adları; o adla eklenmiş rutinler de bu öneri sayılır.
export type HabitPreset = Pick<Habit, 'title' | 'icon' | 'skill' | 'target' | 'unit' | 'measures'> & { aliases?: string[] };

export const HABIT_XP = 10;
export const MAX_HABITS = 12;
export const MAX_TARGET = 20;
// Süre hedefi 15 dakikalık adımlarla, en fazla 10 saat.
export const GOAL_STEP_MINUTES = 15;
export const MAX_GOAL_MINUTES = 600;

export const habitPresets: HabitPreset[] = [
  { icon: '💧', title: 'Su iç', skill: 'Self Care', target: 8, unit: 'bardak' },
  { icon: '📖', title: 'Kitap okuma', aliases: ['20 dk kitap oku'], skill: 'Learning', measures: ['duration', 'pages'] },
  { icon: '🚶', title: 'Yürüyüş yap', skill: 'Fitness', measures: ['steps', 'duration'] },
  { icon: '🧘', title: 'Meditasyon', skill: 'Self Care' },
  { icon: '🛏️', title: 'Yatağını topla', skill: 'Household' },
  { icon: '📝', title: 'Günlük yaz', skill: 'Self Awareness' },
  { icon: '🏋️', title: 'Spor yap', skill: 'Fitness', measures: ['duration'] },
  { icon: '📵', title: 'Ekransız akşam', skill: 'Self Care' },
];

// Düzenleme modunda rutine seçilebilecek simgeler.
export const habitIcons = ['⭐', '💧', '📖', '🚶', '🧘', '🛏️', '📝', '🏋️', '📵', '🥗', '💊', '🦷', '☀️', '🌙', '🧹', '🎸', '💻', '🚴', '🙏', '❤️'];

// Sayılı rutinlerin günlük sayısı (habit-counts) bu biçimde saklanır ("2026-10-5"); kayıtlı veriyle uyum için değişmez.
export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const isSameDay = (entry: Entry, now: Date) => entryDay(entry) === localDay(now);
export const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

// Rutinin karşılığı olan hazır öneri: adı ya da önerinin eski adlarından biri eşleşir.
export const presetFor = (title: string) => habitPresets.find(preset =>
  [preset.title, ...(preset.aliases ?? [])].some(name => normalizeTitle(name) === normalizeTitle(title)));

// Önerinin eski adıyla eklenmiş rutini yeni ada taşır ("20 dk kitap oku" → "Kitap okuma").
export function renameLegacyHabit<T extends { title: string }>(habit: T): T {
  const preset = presetFor(habit.title);
  return preset && normalizeTitle(preset.title) !== normalizeTitle(habit.title) ? { ...habit, title: preset.title } : habit;
}

// Rutine tik atmak, habitId taşıyan sıradan bir kayıt oluşturur; böylece XP, seri,
// günlük hedef ve rozetler ayrı bir sistem gerektirmeden çalışır.
export function habitEntriesToday(entries: Entry[], now = new Date()): Map<string, Entry> {
  const done = new Map<string, Entry>();
  for (const entry of entries) {
    if (entry.habitId && isSameDay(entry, now) && !done.has(entry.habitId)) done.set(entry.habitId, entry);
  }
  return done;
}

export function routinesProgress(habits: Habit[], entries: Entry[], now = new Date()) {
  const done = habitEntriesToday(entries, now);
  const count = habits.filter(habit => done.has(habit.id)).length;
  return { done, count, total: habits.length, complete: habits.length > 0 && count === habits.length };
}

export function habitAnalysis(habit: Habit): Analysis {
  return {
    skill: habit.skill,
    xp: HABIT_XP,
    reason: 'Rutinini sürdürdün; küçük tekrarlar büyük fark yaratır.',
    awards: [{ skill: habit.skill, xp: HABIT_XP }],
  };
}

export function habitTitleError(title: string, habits: Habit[]): string | null {
  if (!title.trim()) return 'Rutin adı boş olamaz.';
  if (habits.length >= MAX_HABITS) return `En fazla ${MAX_HABITS} rutin ekleyebilirsin.`;
  if (habits.some(habit => normalizeTitle(habit.title) === normalizeTitle(title))) return 'Bu rutin zaten listende.';
  return null;
}

// Günlük hedef: rutinin kendi hedefi; yoksa aynı adlı hazır önerininki (hedef eklenmeden önce eklenmiş "Su iç" de
// 8 bardak sayılır); o da yoksa tek tik.
export function habitGoal(habit: Habit): { target: number; unit: string } {
  const preset = presetFor(habit.title);
  return { target: habit.target ?? preset?.target ?? 1, unit: habit.unit ?? preset?.unit ?? 'kez' };
}

// Tik atarken sorulan ölçüler: rutinin kendi listesi, yoksa aynı adlı hazır önerininki.
export function habitMeasures(habit: Habit): Measure[] {
  return habit.measures ?? presetFor(habit.title)?.measures ?? [];
}

// Süre dakika olarak saklanır. Üst sınırlar yazım hatasını yakalar (ör. fazladan sıfır).
export const MEASURE_LIMITS: Record<Measure, number> = { steps: 100000, duration: 24 * 60, pages: 2000 };
export const measureNames: Record<Measure, string> = { steps: 'Adım', duration: 'Süre', pages: 'Sayfa' };

// Yazılan sayıyı çevirir. Boş → null (ölçü girilmedi); geçersiz → NaN.
export function parseAmount(text: string, decimals = false): number | null {
  const clean = text.trim().replace(/\s/g, '');
  if (!clean) return null;
  // Saatte nokta ve virgül ondalık ayırıcıdır ("1,5", "1.5"); adım ve sayfada binlik ayırıcıdır ("6.500").
  const normalized = decimals ? clean.replace(',', '.') : clean.replace(/[.,]/g, '');
  const value = Number(normalized);
  return /^\d+(\.\d+)?$/.test(normalized) && value > 0 ? value : NaN;
}

// Saat seçilmişse dakikaya çevrilir ("1,5" saat → 90 dk).
export const toMinutes = (value: number, unit: 'dk' | 'saat') => Math.round(unit === 'saat' ? value * 60 : value);

export function measureError(values: MeasureValues): string | null {
  for (const measure of Object.keys(values) as Measure[]) {
    const value = values[measure]!;
    if (!Number.isFinite(value) || value <= 0) return `${measureNames[measure]} için geçerli bir sayı yaz.`;
    if (value > MEASURE_LIMITS[measure]) return measure === 'duration' ? 'Süre 24 saatten uzun olamaz.' : `${measureNames[measure]} en fazla ${MEASURE_LIMITS[measure].toLocaleString('tr-TR')} olabilir.`;
  }
  return null;
}

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours ? `${hours} sa${rest ? ` ${rest} dk` : ''}` : `${minutes} dk`;
};

// "6.500 adım · 45 dk · 30 sayfa"; sıra her zaman aynıdır.
export function formatMeasures(values: MeasureValues | undefined): string {
  if (!values) return '';
  return [
    values.steps ? `${values.steps.toLocaleString('tr-TR')} adım` : null,
    values.duration ? formatDuration(values.duration) : null,
    values.pages ? `${values.pages.toLocaleString('tr-TR')} sayfa` : null,
  ].filter(Boolean).join(' · ');
}

// Son 7 gün (bugün dahil): rutinin kaç gün yapıldığı ve girilen ölçülerin toplamı.
// Sayılı rutinde (su) gün, hedefe ulaşılan gündür; günlük sayılar saklanmadığı için toplam bardak yoktur.
export function weeklyTotals(habit: Habit, entries: Entry[], now = new Date()) {
  const today = localDay(now);
  const start = addDaysToKey(today, -6);
  const days = new Set<string>();
  const totals: MeasureValues = {};
  for (const entry of entries) {
    if (entry.habitId !== habit.id || !isValidDate(entry.createdAt)) continue;
    const day = entryDay(entry);
    if (day < start || day > today) continue;
    days.add(day);
    for (const measure of ['steps', 'duration', 'pages'] as Measure[]) {
      const value = entry.measures?.[measure];
      if (value) totals[measure] = (totals[measure] ?? 0) + value;
    }
  }
  return { days: days.size, totals };
}

// Sayılı rutinlerin bugünkü sayısı. Yalnız bugünün sayısı geçerlidir; ertesi gün sıfırdan başlar.
// Bugün tamamlanmış (kaydı olan) rutin, sayı daha az görünse de hedefte sayılır.
export type HabitCounts = Record<string, { day: string; count: number }>;
export function habitCountToday(counts: HabitCounts, habit: Habit, done: boolean, now = new Date()) {
  const { target } = habitGoal(habit);
  const stored = counts[habit.id]?.day === dayKey(now) ? counts[habit.id].count : 0;
  return Math.min(target, done ? Math.max(stored, target) : stored);
}

export const availablePresets = (habits: Habit[]) =>
  habitPresets.filter(preset => !habits.some(habit => presetFor(habit.title) === preset));

// Günlük rutin hatırlatıcısı. Bildirimler önümüzdeki günler için tek tek kurulur;
// böylece o günün rutinleri tamamsa o günün hatırlatması hiç gelmez.
export type ReminderSettings = { enabled: boolean; hour: number; minute: number };
export const DEFAULT_REMINDER: ReminderSettings = { enabled: false, hour: 20, minute: 0 };
export const REMINDER_DAYS = 14;
export const reminderTimes: [number, number][] = [[7, 30], [9, 0], [12, 30], [18, 0], [20, 0], [21, 30]];
export const formatTime = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export function reminderPlan(settings: ReminderSettings, habits: Habit[], entries: Entry[], now = new Date(), days = REMINDER_DAYS) {
  if (!settings.enabled || habits.length === 0) return [];
  const doneToday = routinesProgress(habits, entries, now).count;
  const plan: { date: Date; body: string }[] = [];
  for (let offset = 0; offset < days; offset++) {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, settings.hour, settings.minute);
    if (date <= now) continue;
    const left = offset === 0 ? habits.length - doneToday : habits.length;
    if (left > 0) plan.push({ date, body: `${left} rutinin seni bekliyor. Serini koru 🔥` });
  }
  return plan;
}
