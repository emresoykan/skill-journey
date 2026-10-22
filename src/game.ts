import { displaySkill } from './mockAnalysis';
import type { Entry } from './storage';

export const LEVEL_XP = 100;
export const QUEST_BONUS = 20;
export const DAILY_GOAL = 3;
export const level = (xp: number) => Math.floor(xp / LEVEL_XP) + 1;
export const entryXp = (entry: Entry) => entry.xp + (entry.bonusXp ?? 0);
export const totalXpOf = (entries: Entry[]) => entries.reduce((sum, entry) => sum + entryXp(entry), 0);

export type Rank = { from: number; title: string; icon: string };
const ranks: Rank[] = [
  { from: 1, title: 'Çaylak', icon: '🌱' },
  { from: 3, title: 'Kaşif', icon: '🧭' },
  { from: 5, title: 'Maceracı', icon: '⚔️' },
  { from: 8, title: 'Usta', icon: '🛡️' },
  { from: 12, title: 'Bilge', icon: '🔮' },
  { from: 20, title: 'Efsane', icon: '👑' },
];
export const rankFor = (lvl: number) => [...ranks].reverse().find(rank => lvl >= rank.from) ?? ranks[0];
export const nextRank = (lvl: number) => ranks.find(rank => rank.from > lvl);

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());
const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
const validDates = (entries: Entry[]) => entries.map(entry => new Date(entry.createdAt)).filter(date => Number.isFinite(date.getTime()));
export const isToday = (iso: string, now = new Date()) => dayKey(new Date(iso)) === dayKey(now);
export const todayEntries = (entries: Entry[], now = new Date()) => entries.filter(entry => isToday(entry.createdAt, now));

export type DayGroup = { key: string; date: Date; entries: Entry[]; xp: number };
// Kayıtları takvim gününe göre gruplar; en yeni gün başta.
export function groupByDay(entries: Entry[]): DayGroup[] {
  const groups = new Map<string, DayGroup>();
  for (const entry of entries) {
    const date = new Date(entry.createdAt);
    if (!Number.isFinite(date.getTime())) continue;
    const key = dayKey(date);
    const group = groups.get(key) ?? { key, date: startOfDay(date), entries: [], xp: 0 };
    group.entries.push(entry);
    group.xp += entryXp(entry);
    groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export function dayLabel(date: Date, now = new Date()): string {
  const diff = Math.round((startOfDay(now).getTime() - startOfDay(date).getTime()) / 86_400_000);
  if (diff === 0) return 'Bugün';
  if (diff === 1) return 'Dün';
  return new Intl.DateTimeFormat('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }).format(date);
}

export type StreakDay = { key: string; label: string; active: boolean; today: boolean };
export type Streak = { count: number; activeToday: boolean; week: StreakDay[] };

export function getStreak(entries: Entry[], now = new Date()): Streak {
  const days = new Set(validDates(entries).map(dayKey));
  const today = startOfDay(now);
  const activeToday = days.has(dayKey(today));
  // Bugün henüz kayıt yoksa seri dünden geriye sayılır; gün bitene kadar kırılmış sayılmaz.
  const cursor = new Date(today);
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  let count = 0;
  while (days.has(dayKey(cursor))) { count++; cursor.setDate(cursor.getDate() - 1); }
  const week = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(date.getDate() - 6 + index);
    return { key: dayKey(date), label: new Intl.DateTimeFormat('tr-TR', { weekday: 'short' }).format(date), active: days.has(dayKey(date)), today: index === 6 };
  });
  return { count, activeToday, week };
}

export function longestStreak(entries: Entry[]): number {
  const days = [...new Set(validDates(entries).map(date => startOfDay(date).getTime()))].sort((a, b) => a - b);
  let best = 0;
  let run = 0;
  days.forEach((day, index) => {
    // Yaz saati geçişlerinde gün farkı 23/25 saat olabilir, bu yüzden yuvarlanır.
    run = index > 0 && Math.round((day - days[index - 1]) / 86_400_000) === 1 ? run + 1 : 1;
    best = Math.max(best, run);
  });
  return best;
}

export type Quest = { skill: string; title: string; hint: string; bonus: number };
const quests: Omit<Quest, 'title' | 'bonus'>[] = [
  { skill: 'Communication', hint: 'Birine bir şey anlattığın, sunduğun ya da birini dinlediğin bir anı yaz.' },
  { skill: 'Problem Solving', hint: 'Çözdüğün bir sorunu ya da düzelttiğin bir hatayı anlat.' },
  { skill: 'Collaboration', hint: 'Birine yardım ettiğin veya ekipçe bir şey başardığınız bir anı yaz.' },
  { skill: 'Learning', hint: 'Bugün öğrendiğin, okuduğun ya da pratik yaptığın bir şeyi anlat.' },
  { skill: 'Creativity', hint: 'Yazdığın, çizdiğin, tasarladığın ya da ürettiğin bir şeyi paylaş.' },
  { skill: 'Resilience', hint: 'Zorlandığın ama vazgeçmeyip tekrar denediğin bir anı yaz.' },
  { skill: 'Fitness', hint: 'Spor, yürüyüş ya da antrenman yaptığın bir anı anlat.' },
];

export function dailyQuest(now = new Date()): Quest {
  // Aynı gün herkes için aynı görev; ertesi gün yenisi gelir.
  const seed = now.getFullYear() * 372 + now.getMonth() * 31 + now.getDate();
  const quest = quests[seed % quests.length];
  return { ...quest, title: `${displaySkill(quest.skill)} anı yaz`, bonus: QUEST_BONUS };
}

export const questDoneToday = (entries: Entry[], now = new Date()) =>
  entries.some(entry => (entry.bonusXp ?? 0) > 0 && isToday(entry.createdAt, now));

type Stats = { entries: number; skills: number; level: number; streak: number; quests: number; combo: number; skillLevel: number; goalDays: number; habitChecks: number; habitStreak: number; learnings: number; recalls: number };
export type Badge = { id: string; icon: string; title: string; description: string; stat: keyof Stats; goal: number };
export type BadgeProgress = Badge & { current: number; unlocked: boolean };

export const badges: Badge[] = [
  { id: 'first', icon: '✨', title: 'İlk Adım', description: 'İlk kaydını ekle', stat: 'entries', goal: 1 },
  { id: 'streak3', icon: '🔥', title: 'Kıvılcım', description: '3 günlük seri yap', stat: 'streak', goal: 3 },
  { id: 'skills3', icon: '🧩', title: 'Çok Yönlü', description: '3 farklı beceri keşfet', stat: 'skills', goal: 3 },
  { id: 'combo', icon: '💥', title: 'Kombo', description: 'Tek anda 3 beceri kazan', stat: 'combo', goal: 3 },
  { id: 'quest1', icon: '🎯', title: 'Görev Avcısı', description: 'İlk günlük görevi tamamla', stat: 'quests', goal: 1 },
  { id: 'goal1', icon: '✅', title: 'Tam Gün', description: `Bir günde ${DAILY_GOAL} şey kaydet`, stat: 'goalDays', goal: 1 },
  { id: 'habit1', icon: '🌱', title: 'İlk Rutin', description: 'Bir rutine ilk tikini at', stat: 'habitChecks', goal: 1 },
  { id: 'learn10', icon: '📚', title: 'Meraklı', description: '10 kavram ya da kelime öğren', stat: 'learnings', goal: 10 },
  { id: 'entries5', icon: '📔', title: 'Günlükçü', description: '5 şey kaydet', stat: 'entries', goal: 5 },
  { id: 'streak7', icon: '☄️', title: 'Alev Alev', description: '7 günlük seri yap', stat: 'streak', goal: 7 },
  { id: 'level5', icon: '⭐', title: 'Yükselen Yıldız', description: 'Seviye 5’e ulaş', stat: 'level', goal: 5 },
  { id: 'skillLevel3', icon: '🏆', title: 'Uzmanlık', description: 'Bir beceride seviye 3’e ulaş', stat: 'skillLevel', goal: 3 },
  { id: 'skills6', icon: '🌈', title: 'Rönesans', description: '6 farklı beceri keşfet', stat: 'skills', goal: 6 },
  { id: 'quests5', icon: '🏹', title: 'Görev Ustası', description: '5 günlük görev tamamla', stat: 'quests', goal: 5 },
  { id: 'goal7', icon: '🗓️', title: 'Disiplin', description: '7 gün hedefini tamamla', stat: 'goalDays', goal: 7 },
  { id: 'habit7', icon: '🌅', title: 'Rutin Ustası', description: 'Bir rutini 7 gün üst üste yap', stat: 'habitStreak', goal: 7 },
  { id: 'entries20', icon: '📚', title: 'Hikâye Anlatıcısı', description: '20 şey kaydet', stat: 'entries', goal: 20 },
  { id: 'entries50', icon: '🏛️', title: 'Arşivci', description: '50 şey kaydet', stat: 'entries', goal: 50 },
  { id: 'habit21', icon: '🔁', title: 'Alışkanlık', description: 'Bir rutini 21 gün üst üste yap', stat: 'habitStreak', goal: 21 },
  { id: 'recall20', icon: '🧠', title: 'Hafıza Ustası', description: 'Tekrarlarda 20 kez hatırla', stat: 'recalls', goal: 20 },
];

function getStats(entries: Entry[]): Stats {
  const skillXp = entries.flatMap(entry => entry.awards).reduce<Record<string, number>>((totals, award) => {
    totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
    return totals;
  }, {});
  return {
    entries: entries.length,
    skills: Object.keys(skillXp).length,
    level: level(totalXpOf(entries)),
    streak: longestStreak(entries),
    quests: entries.filter(entry => (entry.bonusXp ?? 0) > 0).length,
    combo: Math.max(0, ...entries.map(entry => entry.awards.length)),
    skillLevel: Math.max(0, ...Object.values(skillXp).map(level)),
    goalDays: groupByDay(entries).filter(group => group.entries.length >= DAILY_GOAL).length,
    habitChecks: entries.filter(entry => entry.habitId).length,
    learnings: entries.filter(entry => entry.learning).length,
    recalls: entries.reduce((sum, entry) => sum + (entry.review?.count ?? 0), 0),
    habitStreak: Math.max(0, ...[...new Set(entries.map(entry => entry.habitId).filter(Boolean))]
      .map(id => longestStreak(entries.filter(entry => entry.habitId === id)))),
  };
}

export function badgeProgress(entries: Entry[]): BadgeProgress[] {
  const stats = getStats(entries);
  return badges.map(badge => ({ ...badge, current: Math.min(stats[badge.stat], badge.goal), unlocked: stats[badge.stat] >= badge.goal }));
}

export function newlyUnlocked(before: Entry[], after: Entry[]): Badge[] {
  const had = new Set(badgeProgress(before).filter(badge => badge.unlocked).map(badge => badge.id));
  return badgeProgress(after).filter(badge => badge.unlocked && !had.has(badge.id));
}

// Tek bir rutinin serisi ve son 7 günü; genel seri hesabını o rutinin kayıtlarıyla çalıştırır.
export const habitStreak = (entries: Entry[], habitId: string, now = new Date()) =>
  getStreak(entries.filter(entry => entry.habitId === habitId), now);
