// Gelişim ve Anılar ekranlarının hesapları. Hepsi kayıtlardan türetilir; tahmin ya da uydurma içerik yoktur.
// Saf modül; npm test doğrudan çalıştırabilir.
import { addDaysToKey, dayKey, entryDay, isValidDate } from './dates';
import { entryXp, longestStreak } from './game';
import { catalog, displaySkill, domainOf, isWithin } from './skillEngine';
import type { Entry } from './storage';

export type SkillSummary = { skill: string; xp: number; count: number };

// Becerilerin toplam XP'si ve kaç kayıtta geçtiği; en çok XP önce.
export function skillSummaries(entries: Entry[]): SkillSummary[] {
  const map = new Map<string, SkillSummary>();
  for (const entry of entries) {
    for (const award of entry.awards) {
      const item = map.get(award.skill) ?? { skill: award.skill, xp: 0, count: 0 };
      item.xp += award.xp;
      item.count += 1;
      map.set(award.skill, item);
    }
  }
  return [...map.values()].sort((a, b) => b.xp - a.xp || b.count - a.count || a.skill.localeCompare(b.skill));
}

// Son `days` günde (bugün dahil) XP'si en çok artan beceriler.
export function growingSkills(entries: Entry[], now = new Date(), days = 30, limit = 3): SkillSummary[] {
  const start = addDaysToKey(dayKey(now), 1 - days);
  return skillSummaries(entries.filter(entry => isValidDate(entry.createdAt) && entryDay(entry) >= start)).slice(0, limit);
}

// Her becerinin ilk görüldüğü kayıt (en eski kayıt önce gelir). Anılar'da "ilk kez" işareti bundan çıkar.
export function firstSkillEntries(entries: Entry[]): Map<string, Entry> {
  const sorted = entries.filter(entry => isValidDate(entry.createdAt)).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = new Map<string, Entry>();
  for (const entry of sorted) for (const award of entry.awards) if (!first.has(award.skill)) first.set(award.skill, entry);
  return first;
}

// Kayıt kimliği → o kayıtta ilk kez görülen beceriler.
export function discoveriesByEntry(entries: Entry[]): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [skill, entry] of firstSkillEntries(entries)) result.set(entry.id, [...(result.get(entry.id) ?? []), skill]);
  return result;
}

// Son `days` günde ilk kez görülen beceriler (en yeni önce).
export function newSkills(entries: Entry[], now = new Date(), days = 30): { skill: string; entry: Entry }[] {
  const start = addDaysToKey(dayKey(now), 1 - days);
  return [...firstSkillEntries(entries)].filter(([, entry]) => entryDay(entry) >= start)
    .map(([skill, entry]) => ({ skill, entry }))
    .sort((a, b) => b.entry.createdAt.localeCompare(a.entry.createdAt));
}

// Öğrenme kaydı: "Bugün öğrendiğim", tekrar oturumu ya da Öğrenme becerisi (ve alt becerileri) içeren kayıt.
export const isLearningEntry = (entry: Entry) =>
  !!entry.learning || !!entry.review || entry.awards.some(award => isWithin(award.skill, 'Learning'));

// Son `weeks` haftanın her birinde öğrenme yapılan gün sayısı (en eski hafta önce; son hafta bugünle biter).
export function learningWeeks(entries: Entry[], now = new Date(), weeks = 4): { start: string; days: number }[] {
  const learningDays = new Set(entries.filter(entry => isValidDate(entry.createdAt) && isLearningEntry(entry)).map(entryDay));
  const today = dayKey(now);
  return Array.from({ length: weeks }, (_, index) => {
    const start = addDaysToKey(today, -7 * (weeks - index) + 1);
    let days = 0;
    for (let offset = 0; offset < 7; offset++) if (learningDays.has(addDaysToKey(start, offset))) days++;
    return { start, days };
  });
}

export type Overview = { entries: number; skills: number; activeDays: number; longestStreak: number; last7: number; last30Days: number };

// Genel bakış sayıları. activeDays: kayıt olan farklı gün; last30Days: son 30 günde kayıt olan gün.
export function overview(entries: Entry[], now = new Date()): Overview {
  const valid = entries.filter(entry => isValidDate(entry.createdAt));
  const days = new Set(valid.map(entryDay));
  const today = dayKey(now);
  const week = addDaysToKey(today, -6);
  const month = addDaysToKey(today, -29);
  return {
    entries: entries.length,
    skills: skillSummaries(entries).length,
    activeDays: days.size,
    longestStreak: longestStreak(entries),
    last7: valid.filter(entry => entryDay(entry) >= week).length,
    last30Days: [...days].filter(day => day >= month && day <= today).length,
  };
}

// ── Anılar filtreleri ────────────────────────────────────────────────────────────
export type DateRange = 'all' | 'week' | 'month' | 'quarter' | 'year';
export const dateRanges: { key: DateRange; label: string; days: number | null }[] = [
  { key: 'all', label: 'Tümü', days: null },
  { key: 'week', label: 'Son 7 gün', days: 7 },
  { key: 'month', label: 'Son 30 gün', days: 30 },
  { key: 'quarter', label: 'Son 3 ay', days: 91 },
  { key: 'year', label: 'Son 1 yıl', days: 365 },
];
export type EntryFilter = { query?: string; range?: DateRange; skill?: string | null; domain?: string | null };

const fold = (text: string) => text.toLocaleLowerCase('tr-TR');

// Metin araması (kayıt ve beceri adı), tarih aralığı, beceri (alt becerileri dahil) ve alan filtresi.
export function filterEntries(entries: Entry[], filter: EntryFilter, now = new Date()): Entry[] {
  const terms = fold(filter.query ?? '').trim().split(/\s+/).filter(Boolean);
  const days = dateRanges.find(range => range.key === (filter.range ?? 'all'))?.days ?? null;
  const start = days ? addDaysToKey(dayKey(now), 1 - days) : null;
  return entries.filter(entry => {
    if (start && (!isValidDate(entry.createdAt) || entryDay(entry) < start)) return false;
    if (filter.skill && !entry.awards.some(award => isWithin(award.skill, filter.skill!))) return false;
    if (filter.domain && !entry.awards.some(award => domainOf(award.skill) === filter.domain)) return false;
    if (!terms.length) return true;
    const haystack = fold([entry.description, ...entry.awards.map(award => displaySkill(award.skill))].join(' '));
    return terms.every(term => haystack.includes(term));
  });
}

// Filtre seçenekleri yalnız kayıtlarda geçen beceri ve alanlardan oluşur (boş seçenek gösterilmez).
export function filterOptions(entries: Entry[]): { skills: string[]; domains: string[] } {
  const skills = skillSummaries(entries).map(item => item.skill);
  const order = [...new Set(catalog.map(skill => domainOf(skill.id)))];
  const domains = [...new Set(skills.map(domainOf))].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
  return { skills, domains };
}

export const sumXp = (entries: Entry[]) => entries.reduce((total, entry) => total + entryXp(entry), 0);
