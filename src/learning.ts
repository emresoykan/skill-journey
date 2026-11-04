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

// explanation, example, category isteğe bağlıdır; kategori kullanıcının kendi yazdığı addır ("İngilizce", "Finans").
export type Learning = { term: string; meaning: string; explanation?: string; example?: string; category?: string };
// Tekrar durumu kayıt kimliğine göre tutulur: stage = kaç kez üst üste hatırlandığı, due = sıradaki tekrar günü,
// correct/wrong = toplam hatırlanan/unutulan sayısı (bu alanlardan önceki tekrarlar sayılmamıştır).
export type ReviewState = { stage: number; due: string; correct?: number; wrong?: number };

export const LEARNING_LIMITS = { term: 80, meaning: 240, explanation: 500, example: 240, category: 30 } as const;
const clean = (value: string | undefined, max: number) => (value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
// Boş isteğe bağlı alanlar saklanmaz.
export function cleanLearning(input: Learning): Learning {
  const optional = (['explanation', 'example', 'category'] as const)
    .map(key => [key, clean(input[key], LEARNING_LIMITS[key])] as const).filter(([, value]) => value);
  return { term: clean(input.term, LEARNING_LIMITS.term), meaning: clean(input.meaning, LEARNING_LIMITS.meaning), ...Object.fromEntries(optional) };
}

// Defterdeki kategoriler, en çok kullanılan önce.
export function learningCategories(entries: Entry[]): string[] {
  const counts = new Map<string, number>();
  for (const entry of entries) {
    const category = entry.learning?.category;
    if (category) counts.set(category, (counts.get(category) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'tr')).map(([category]) => category);
}
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
  const counts = { correct: (state.correct ?? 0) + (remembered ? 1 : 0), wrong: (state.wrong ?? 0) + (remembered ? 0 : 1) };
  if (!remembered) return { stage: 0, due: dayKey(addDays(now, REVIEW_INTERVALS[0])), ...counts };
  const stage = Math.min(state.stage + 1, MASTERED_STAGE);
  return { stage, due: stage >= MASTERED_STAGE ? '' : dayKey(addDays(now, REVIEW_INTERVALS[stage])), ...counts };
}

// Önümüzdeki günlerde (bugün hariç, `days` gün) tekrarı gelecek kavram sayısı.
export function upcomingReviews(entries: Entry[], reviews: Reviews, now = new Date(), days = 7): number {
  const today = dayKey(now);
  const last = dayKey(addDays(now, days));
  return entries.filter(entry => entry.learning).map(entry => reviewStateOf(entry, reviews))
    .filter(state => !isMastered(state) && state.due > today && state.due <= last).length;
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

// Aynı kavram iki kart olmasın: bugün eklendiyse ya da defterde hâlâ tekrar ediliyorsa eklenmez.
// Ustalaşılmış kavram yeniden eklenebilir (yeniden öğrenme).
export function learningError(term: string, meaning: string, entries: Entry[], now = new Date(), reviews: Reviews = {}): string | null {
  if (!term.trim()) return 'Öğrendiğin kavramı ya da kelimeyi yaz.';
  if (!meaning.trim()) return 'Anlamını ya da kısa bir açıklama yaz; tekrar ederken işine yarayacak.';
  const normalized = foldTerm(term);
  const today = dayKey(now);
  const same = entries.filter(entry => entry.learning && foldTerm(entry.learning.term) === normalized);
  if (same.some(entry => entryDay(entry) === today)) return 'Bunu bugün zaten ekledin.';
  const active = same.find(entry => !isMastered(reviewStateOf(entry, reviews)));
  if (active) {
    const date = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' }).format(new Date(active.createdAt));
    return `"${active.learning!.term}" zaten defterinde (${date}); tekrarlarda karşına gelecek.`;
  }
  return null;
}

// 🌱 yeni · 🌿 oturuyor · 🌳 ustalaşıldı
export const stageIcon = (state: ReviewState) => isMastered(state) ? '🌳' : state.stage >= 2 ? '🌿' : '🌱';
