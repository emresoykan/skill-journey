// Günlük rutinlerin saf mantığı. Yalnız tip içe aktarır; npm test doğrudan çalıştırabilir.
import { addDaysToKey, dayKey as localDay, entryDay, isValidDate } from './dates';
import type { Analysis } from './skillEngine';
import type { Entry } from './storage';

// Rutinleri kullanıcı kendisi tanımlar. unit varsa rutin miktarlıdır: her gün ne kadar yapıldığı girilir
// ("İngilizce · 20 kelime"); target, isteğe bağlı günlük hedeftir. unit yoksa rutin tek tikle yapılır.
// measures ve goalMinutes eski sürümün sabit ölçüleridir (adım/süre/sayfa); artık sorulmaz, eski kayıtlarda görünür.
export type Measure = 'steps' | 'duration' | 'pages';
export type MeasureValues = Partial<Record<Measure, number>>;
export type Habit = { id: string; title: string; icon: string; skill: string; createdAt: string; target?: number; unit?: string; measures?: Measure[]; goalMinutes?: number };

export const HABIT_XP = 10;
export const MAX_HABITS = 12;
// Günlük miktar ve hedef için üst sınır; yazım hatasını (fazladan sıfır) yakalar.
export const MAX_AMOUNT = 100000;
export const MAX_UNIT_LENGTH = 20;

// Eski sürümdeki hazır önerilerin ayarları. Yalnız göç 2 kullanır: bu adlarla eklenmiş, birimi
// saklanmamış rutinlere birim ve hedef yazılır (bkz. migrations.ts). Yeni rutin önerisi yoktur.
export const LEGACY_HABIT_SETTINGS: Record<string, { unit: string; target?: number }> = {
  'su iç': { unit: 'bardak', target: 8 },
  'kitap okuma': { unit: 'sayfa' },
  'yürüyüş yap': { unit: 'adım' },
  'spor yap': { unit: 'dk' },
};
const LEGACY_NAMES: Record<string, string> = { '20 dk kitap oku': 'Kitap okuma' };

// Düzenleme modunda rutine seçilebilecek simgeler.
export const habitIcons = ['⭐', '💧', '📖', '🚶', '🧘', '🛏️', '📝', '🏋️', '📵', '🥗', '💊', '🦷', '☀️', '🌙', '🧹', '🎸', '💻', '🚴', '🙏', '❤️'];

// Sayılı rutinlerin günlük sayısı (habit-counts) bu biçimde saklanır ("2026-10-5"); kayıtlı veriyle uyum için değişmez.
export const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const isSameDay = (entry: Entry, now: Date) => entryDay(entry) === localDay(now);
export const normalizeTitle = (title: string) => title.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

// Eski hazır önerinin eski adıyla eklenmiş rutini yeni ada taşır ("20 dk kitap oku" → "Kitap okuma").
export function renameLegacyHabit<T extends { title: string }>(habit: T): T {
  const name = LEGACY_NAMES[normalizeTitle(habit.title)];
  return name ? { ...habit, title: name } : habit;
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

export const isAmountHabit = (habit: Habit) => !!habit.unit?.trim();
// Rutin bugün ne zaman "yapıldı" sayılır: miktarlı rutinde hedefe (hedef yoksa ilk girişe) ulaşınca, tik rutininde tikle.
export function habitGoal(habit: Habit): { target: number; unit: string; hasTarget: boolean } {
  const hasTarget = isAmountHabit(habit) && Number.isFinite(habit.target) && habit.target! > 0;
  return { target: hasTarget ? habit.target! : 1, unit: habit.unit?.trim() ?? '', hasTarget };
}

export const formatAmount = (value: number) => value.toLocaleString('tr-TR');
// "İngilizce · 20 kelime": miktarlı rutinin günlük kaydının metni.
export const amountDescription = (habit: Habit, total: number) => `${habit.title} · ${formatAmount(total)} ${habitGoal(habit).unit}`;

// Rutin ayarlarının (birim, hedef) doğrulaması. Hedef 0 ya da boş: hedef yok.
export function habitSettingsError(unit: string, target: number | null): string | null {
  if (unit.trim().length > MAX_UNIT_LENGTH) return `Birim en fazla ${MAX_UNIT_LENGTH} karakter olabilir.`;
  if (target !== null && (!Number.isInteger(target) || target < 0 || target > MAX_AMOUNT)) return `Hedef 1 ile ${formatAmount(MAX_AMOUNT)} arasında tam sayı olmalı.`;
  if (target && !unit.trim()) return 'Hedef için bir birim yaz (ör. kelime, sayfa, dk).';
  return null;
}

// Yazılan sayıyı çevirir. Boş → null (girilmedi); geçersiz → NaN.
export function parseAmount(text: string, decimals = false): number | null {
  const clean = text.trim().replace(/\s/g, '');
  if (!clean) return null;
  // Saatte nokta ve virgül ondalık ayırıcıdır ("1,5", "1.5"); adım ve sayfada binlik ayırıcıdır ("6.500").
  const normalized = decimals ? clean.replace(',', '.') : clean.replace(/[.,]/g, '');
  const value = Number(normalized);
  return /^\d+(\.\d+)?$/.test(normalized) && value > 0 ? value : NaN;
}

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60), rest = minutes % 60;
  return hours ? `${hours} sa${rest ? ` ${rest} dk` : ''}` : `${minutes} dk`;
};

// Eski kayıtlardaki sabit ölçüler: "6.500 adım · 45 dk · 30 sayfa"; sıra her zaman aynıdır.
export function formatMeasures(values: MeasureValues | undefined): string {
  if (!values) return '';
  return [
    values.steps ? `${values.steps.toLocaleString('tr-TR')} adım` : null,
    values.duration ? formatDuration(values.duration) : null,
    values.pages ? `${values.pages.toLocaleString('tr-TR')} sayfa` : null,
  ].filter(Boolean).join(' · ');
}

// Son 7 gün (bugün dahil): rutinin kaç gün yapıldığı, girilen miktarların toplamı (rutinin şimdiki birimiyle
// girilmiş olanlar) ve eski kayıtlardaki sabit ölçülerin toplamı.
export function weeklyTotals(habit: Habit, entries: Entry[], now = new Date()) {
  const today = localDay(now);
  const start = addDaysToKey(today, -6);
  const days = new Set<string>();
  const totals: MeasureValues = {};
  const unit = habitGoal(habit).unit;
  let amount = 0;
  for (const entry of entries) {
    if (entry.habitId !== habit.id || !isValidDate(entry.createdAt)) continue;
    const day = entryDay(entry);
    if (day < start || day > today) continue;
    days.add(day);
    if (entry.amount && entry.amount.unit === unit) amount += entry.amount.value;
    for (const measure of ['steps', 'duration', 'pages'] as Measure[]) {
      const value = entry.measures?.[measure];
      if (value) totals[measure] = (totals[measure] ?? 0) + value;
    }
  }
  return { days: days.size, amount, totals };
}

// Miktarlı rutinin bugünkü toplamı (habit-counts'ta saklanır; ertesi gün sıfırdan başlar).
// Bugünkü kaydı olup sayısı saklanmamış rutin (eski sürüm) kayıttaki miktarla, o da yoksa hedefle sayılır.
export type HabitCounts = Record<string, { day: string; count: number }>;
export function habitCountToday(counts: HabitCounts, habit: Habit, doneEntry?: Entry, now = new Date()) {
  const stored = counts[habit.id]?.day === dayKey(now) ? counts[habit.id].count : 0;
  if (!doneEntry) return stored;
  return Math.max(stored, doneEntry.amount?.value ?? habitGoal(habit).target);
}

// Yeni toplamla rutinin bugünkü durumu: yapıldı mı (kayıt olmalı mı)?
export const amountReached = (habit: Habit, total: number) => total > 0 && total >= habitGoal(habit).target;

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
