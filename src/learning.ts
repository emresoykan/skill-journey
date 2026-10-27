// "Öğrendiklerim": kavram/kelime kayıtları ve aralıklı tekrarın saf mantığı.
// Yalnız tip içe aktarır; npm test doğrudan çalıştırabilir.
import { addDaysToKey, dayKey, entryDay } from './dates';
import type { Analysis } from './skillEngine';
import type { Entry } from './storage';

export const LEARN_XP = 12;
export const REVIEW_XP = 4;
// Hatırladıkça bir sonraki tekrar bu kadar gün sonraya kayar; sonuncusunu da geçen kavram ustalaşılmış sayılır.
export const REVIEW_INTERVALS = [1, 3, 7, 14, 30];
export const MASTERED_STAGE = REVIEW_INTERVALS.length;

export type Learning = { term: string; meaning: string };
// Tekrar durumu kayıt kimliğine göre tutulur: stage = kaç kez üst üste hatırlandığı, due = sıradaki tekrar günü.
export type ReviewState = { stage: number; due: string };
export type Reviews = Record<string, ReviewState>;

export { dayKey };
const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const learningDescription = ({ term, meaning }: Learning) => `${term} — ${meaning}`;

// Tek satırdan kavram ve anlamı ayırır: "Serendipity: şans eseri güzel bir keşif". Ayraç ":", "=", tire
// ya da sesle söylemeye uygun " anlamı " / " demek " olabilir; ilk geçen ayraç kullanılır.
// "Ephemeral'ın anlamı geçici" gibi ifadede kavramdaki iyelik eki ('ın) atılır. Ayraç yoksa anlam boştur.
const SEPARATORS = [/\s*[:=]\s*/u, /\s+[—–-]\s+/u, /\s+(?:anlamı|demek)\s+/iu];
export function splitLearning(text: string): Learning {
  const clean = text.trim().replace(/\s+/g, ' ');
  const found = SEPARATORS.map(pattern => pattern.exec(clean)).filter((match): match is RegExpExecArray => !!match && match.index > 0)
    .sort((a, b) => a.index - b.index)[0];
  if (!found) return { term: clean, meaning: '' };
  const term = clean.slice(0, found.index).replace(/['’](n?[ıiuü]n)$/u, '').trim();
  return { term, meaning: clean.slice(found.index + found[0].length).trim() };
}

export function learningAnalysis(): Analysis {
  return { skill: 'Learning', xp: LEARN_XP, reason: 'Yeni bir şey öğrendin; tekrar ettikçe kalıcı olacak.', awards: [{ skill: 'Learning', xp: LEARN_XP }] };
}

export function reviewAnalysis(count: number): Analysis {
  const xp = count * REVIEW_XP;
  return { skill: 'Learning', xp, reason: 'Öğrendiklerini tekrar ederek kalıcı hale getirdin.', awards: [{ skill: 'Learning', xp }] };
}

export const reviewDescription = (count: number) => `🧠 ${count} kavramı tekrar ettim`;

// İlk tekrar, öğrenildiği günün ertesi günü.
export const initialReview = (now = new Date()): ReviewState => ({ stage: 0, due: dayKey(addDays(now, REVIEW_INTERVALS[0])) });

export function nextReview(state: ReviewState, remembered: boolean, now = new Date()): ReviewState {
  if (!remembered) return { stage: 0, due: dayKey(addDays(now, REVIEW_INTERVALS[0])) };
  const stage = Math.min(state.stage + 1, MASTERED_STAGE);
  return { stage, due: stage >= MASTERED_STAGE ? '' : dayKey(addDays(now, REVIEW_INTERVALS[stage])) };
}

// İlk tekrar, kavramın öğrenildiği günün (kayıt saat dilimine göre) ertesi günü.
export const reviewStateOf = (entry: Entry, reviews: Reviews): ReviewState =>
  reviews[entry.id] ?? { stage: 0, due: addDaysToKey(entryDay(entry), REVIEW_INTERVALS[0]) };

export const isMastered = (state: ReviewState) => state.stage >= MASTERED_STAGE;

// Bugün (ya da daha önce) tekrarı gelmiş kavramlar; en eski tarihli önce.
export function dueLearnings(entries: Entry[], reviews: Reviews, now = new Date()): Entry[] {
  const today = dayKey(now);
  return entries
    .filter(entry => entry.learning)
    .map(entry => ({ entry, state: reviewStateOf(entry, reviews) }))
    .filter(({ state }) => !isMastered(state) && state.due <= today)
    .sort((a, b) => a.state.due.localeCompare(b.state.due) || a.entry.createdAt.localeCompare(b.entry.createdAt))
    .map(({ entry }) => entry);
}

export const reviewEntryToday = (entries: Entry[], now = new Date()) =>
  entries.find(entry => entry.review && entryDay(entry) === dayKey(now));

// Türkçe küçük harfte "I" → "ı" olur; İngilizce kelimeler de eşleşsin diye ı ile i aynı sayılır.
const foldTerm = (term: string) => term.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

export function learningError(term: string, meaning: string, entries: Entry[], now = new Date()): string | null {
  if (!term.trim()) return 'Öğrendiğin kavramı ya da kelimeyi yaz.';
  if (!meaning.trim()) return 'Anlamını ya da kısa bir açıklama yaz; tekrar ederken işine yarayacak.';
  const normalized = foldTerm(term);
  const today = dayKey(now);
  if (entries.some(entry => entry.learning && foldTerm(entry.learning.term) === normalized && entryDay(entry) === today)) {
    return 'Bunu bugün zaten ekledin.';
  }
  return null;
}

// 🌱 yeni · 🌿 oturuyor · 🌳 ustalaşıldı
export const stageIcon = (state: ReviewState) => isMastered(state) ? '🌳' : state.stage >= 2 ? '🌿' : '🌱';
