// Haftalık değerlendirme: son 7 gün (bugün dahil) ile önceki 7 günün karşılaştırması. Yapay zekâ yoktur;
// her sayı ve öneri kayıtlardan hesaplanır ve gerekçesi (reason) yanında verilir. Saf modül.
import { addDaysToKey, dayKey, entryDay, isValidDate } from './dates';
import { badges, entryXp, level, toNumber } from './game';
import { firstSkillEntries, skillSummaries, type SkillSummary } from './insights';
import { depthLabels, displaySkill, domainOf, type Depth } from './skillEngine';
import type { Entry } from './storage';

export type Suggestion = { text: string; reason: string };
export type WeeklyReview = {
  start: string; end: string;
  entries: number; prevEntries: number;
  breakdown: { moments: number; habits: number; learnings: number; reviews: number };
  xp: number; prevXp: number;
  activeDays: number; prevActiveDays: number;
  topSkills: SkillSummary[];
  newSkills: { skill: string; description: string }[];
  learned: number; recalled: number;
  depths: { depth: Depth; label: string; count: number }[];
  milestones: string[];
  quietDomains: { domain: string; earlier: number }[];
  suggestions: Suggestion[];
};

const inRange = (entry: Entry, from: string, to: string) => {
  if (!isValidDate(entry.createdAt)) return false;
  const day = entryDay(entry);
  return day >= from && day <= to;
};
const DEPTH_ORDER: Depth[] = ['exposure', 'learned', 'practiced', 'applied', 'produced', 'taught', 'mastery'];

// earned: kalıcı rozetler (kimlik → kazanılma anı; '' tarihi bilinmeyen). dueReviews: bugün tekrarı gelmiş kavram sayısı.
export function weeklyReview(entries: Entry[], now = new Date(), earned: Record<string, string> = {}, dueReviews = 0): WeeklyReview {
  const end = dayKey(now);
  const start = addDaysToKey(end, -6);
  const prevStart = addDaysToKey(start, -7);
  const prevEnd = addDaysToKey(start, -1);
  const week = entries.filter(entry => inRange(entry, start, end));
  const prev = entries.filter(entry => inRange(entry, prevStart, prevEnd));
  const before = entries.filter(entry => isValidDate(entry.createdAt) && entryDay(entry) < start);
  const sumXp = (list: Entry[]) => list.reduce((total, entry) => total + entryXp(entry), 0);
  const days = (list: Entry[]) => new Set(list.map(entryDay)).size;

  const firsts = firstSkillEntries(entries);
  const newSkills = [...firsts].filter(([, entry]) => inRange(entry, start, end)).map(([skill, entry]) => ({ skill, description: entry.description }));

  const depthCount = new Map<Depth, number>();
  for (const entry of week) if (entry.depth) depthCount.set(entry.depth, (depthCount.get(entry.depth) ?? 0) + 1);
  const depths = DEPTH_ORDER.filter(depth => depthCount.has(depth)).map(depth => ({ depth, label: depthLabels[depth], count: depthCount.get(depth)! }));

  // Kilometre taşları: bu hafta ulaşılan genel seviye, beceri seviyeleri ve kazanılan rozetler.
  const milestones: string[] = [];
  const levelBefore = level(sumXp(before));
  const levelNow = level(sumXp(before) + sumXp(week));
  if (levelNow > levelBefore) milestones.push(`Seviye ${toNumber(levelNow)} ulaştın`);
  const skillBefore = new Map(skillSummaries(before).map(item => [item.skill, item.xp]));
  for (const item of skillSummaries([...before, ...week])) {
    const from = level(skillBefore.get(item.skill) ?? 0);
    const to = level(item.xp);
    if (to > from && to > 1) milestones.push(`${displaySkill(item.skill)} seviye ${to} oldu`);
  }
  for (const badge of badges) {
    const at = earned[badge.id];
    if (at && inRange({ createdAt: at } as Entry, start, end)) milestones.push(`${badge.icon} ${badge.title} rozetini kazandın`);
  }

  // Son dört haftada (bu haftadan önce) kaydı olup bu hafta hiç kaydı olmayan alanlar.
  const earlier = entries.filter(entry => inRange(entry, addDaysToKey(start, -28), prevEnd));
  const domainCount = (list: Entry[]) => {
    const counts = new Map<string, number>();
    for (const entry of list) for (const domain of new Set(entry.awards.map(award => domainOf(award.skill)))) counts.set(domain, (counts.get(domain) ?? 0) + 1);
    return counts;
  };
  const thisWeekDomains = domainCount(week);
  const quietDomains = [...domainCount(earlier)].filter(([domain, count]) => count >= 2 && !thisWeekDomains.has(domain))
    .sort((a, b) => b[1] - a[1]).map(([domain, count]) => ({ domain, earlier: count }));

  const review: Omit<WeeklyReview, 'suggestions'> = {
    start, end,
    entries: week.length, prevEntries: prev.length,
    breakdown: {
      moments: week.filter(entry => !entry.habitId && !entry.learning && !entry.review).length,
      habits: week.filter(entry => entry.habitId).length,
      learnings: week.filter(entry => entry.learning).length,
      reviews: week.filter(entry => entry.review).length,
    },
    xp: sumXp(week), prevXp: sumXp(prev),
    activeDays: days(week), prevActiveDays: days(prev),
    topSkills: skillSummaries(week).slice(0, 5),
    newSkills,
    learned: week.filter(entry => entry.learning).length,
    recalled: week.reduce((total, entry) => total + (entry.review?.count ?? 0), 0),
    depths,
    milestones,
    quietDomains,
  };
  return { ...review, suggestions: suggestions(review, dueReviews) };
}

// En fazla üç öneri; her biri hangi veriden çıktığını söyler. Veri yoksa öneri de yoktur.
function suggestions(review: Omit<WeeklyReview, 'suggestions'>, dueReviews: number): Suggestion[] {
  const list: Suggestion[] = [];
  if (!review.entries) {
    list.push({ text: 'Bugün tek cümlelik bir kayıtla başla.', reason: 'Son 7 günde hiç kayıt yok.' });
  }
  if (dueReviews > 0) {
    list.push({ text: `"Tekrar zamanı" kartındaki ${dueReviews} kavramı tekrar et.`, reason: `${dueReviews} kavramın tekrar günü geldi.` });
  }
  const quiet = review.quietDomains[0];
  if (quiet) {
    list.push({ text: `${quiet.domain} alanına bu hafta küçük bir adım ekle.`, reason: `Önceki 4 haftada bu alanda ${quiet.earlier} kayıt vardı, bu hafta hiç yok.` });
  }
  const deep = review.depths.filter(item => ['produced', 'taught', 'mastery'].includes(item.depth)).reduce((total, item) => total + item.count, 0);
  const rated = review.depths.reduce((total, item) => total + item.count, 0);
  if (rated >= 3 && deep === 0) {
    list.push({ text: 'Bu hafta bir işi bitirip yaz ya da öğrendiğin bir şeyi birine anlat.', reason: `Derinliği belli ${rated} kaydın hiçbiri "ürettin" ya da "öğrettin" düzeyinde değil.` });
  }
  if (review.entries && review.activeDays < 4 && review.activeDays < review.prevActiveDays) {
    list.push({ text: 'Kısa da olsa her gün bir kayıt girmeyi dene.', reason: `Bu hafta ${review.activeDays} gün kayıt var, geçen hafta ${review.prevActiveDays} gün.` });
  }
  return list.slice(0, 3);
}
