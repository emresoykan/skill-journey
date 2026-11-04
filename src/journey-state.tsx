import { createContext, use, useEffect, useRef, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { analyzeExperience, displaySkill, isNearDuplicate, isWithin, type Analysis } from './skillEngine';
import { loadBadges, loadEntries, loadHabitCounts, loadHabits, loadReviews, loadTodos, runMigrations, saveBadges, saveEntries, saveHabitCounts, saveHabits, saveReviews, saveTodos, StorageConflictError, type EarnedBadges, type Entry } from './storage';
import { cleanTodoTitle, todoTitleError, visibleTodos, type Todo } from './todos';
import { dueLearnings, learningAnalysis, learningDescription, learningError, nextReview, reviewAnalysis, reviewDescription, reviewEntryToday, reviewStateOf, REVIEW_XP, type Reviews } from './learning';
import { amountDescription, amountReached, dayKey, DEFAULT_REMINDER, formatAmount, habitAnalysis, habitCountToday, habitGoal, habitSettingsError, habitTitleError, isAmountHabit, MAX_AMOUNT, routinesProgress, type Habit, type HabitCounts, type ReminderSettings } from './routines';
import { ensureReminderPermission, loadReminder, remindersSupported, saveReminder, sendTestReminder, syncReminders } from './reminders';
import { capAwards, correctSkillAward, removeSkillAward } from './skillCorrections';
import { entryDay, dayKey as localDay } from './dates';
import { DAILY_GOAL, dailyQuest, getStreak, level, newlyUnlocked, questDoneToday, todayEntries, totalXpOf, withEarnedBadges, type Badge } from './game';
import { coin, rewardFeedback, tap } from './feedback';
export type RewardKind = 'moment' | 'habit' | 'learning' | 'review';
export type Reward = { id: string; kind: RewardKind; analysis: Analysis; bonusXp: number; newSkills: string[]; leveledSkills: string[]; leveledUp: boolean; newLevel: number; newBadges: Badge[]; streak: number; streakExtended: boolean; goalReached: boolean; routinesComplete: boolean };
type Store = 'entries' | 'habits' | 'habitCounts' | 'reviews' | 'todos' | 'badges';
// Aynı şey farklı günlerde tekrar yazılabilir ("30 dk yürüdüm"); yalnızca aynı gün içinde aynı ya da
// neredeyse aynı metin engellenir.
const isSameDayDuplicate = (entries: Entry[], description: string, day: string, exceptId?: string) =>
  entries.some(entry => entry.id !== exceptId && entryDay(entry) === day && isNearDuplicate(entry.description, description));
// Bugün elle yazılmış (rutin, öğrenme ve tekrar olmayan) kayıt sayısı; aynı gün çok kayıtta XP azalır.
const freeEntriesToday = (entries: Entry[]) => todayEntries(entries).filter(entry => !entry.habitId && !entry.learning && !entry.review).length;
// Görev bonusu, kayıt görev becerisini (ya da alt becerisini) kaybederse düşer; görev o gün yeniden yapılabilir.
const withQuestCheck = (entry: Entry): Entry =>
  entry.bonusXp && !entry.awards.some(award => isWithin(award.skill, dailyQuest(new Date(entry.createdAt)).skill)) ? { ...entry, bonusXp: undefined } : entry;
function useJourneyState() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitError, setHabitError] = useState('');
  const [habitCounts, setHabitCounts] = useState<HabitCounts>({});
  const [todos, setTodos] = useState<Todo[]>([]);
  const [earnedBadges, setEarnedBadges] = useState<EarnedBadges>({});
  const [syncNotice, setSyncNotice] = useState('');
  const [todoError, setTodoError] = useState('');
  const [reviews, setReviews] = useState<Reviews>({});
  const [learnError, setLearnError] = useState('');
  const [reminder, setReminderState] = useState<ReminderSettings>(DEFAULT_REMINDER);
  const [reminderLoaded, setReminderLoaded] = useState(false);
  const [reminderError, setReminderError] = useState('');
  const [reminderNotice, setReminderNotice] = useState('');
  const [draft, setDraft] = useState('');
  const [reward, setReward] = useState<Reward | null>(null);
  const [levelUpShown, setLevelUpShown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [editNotice, setEditNotice] = useState<{ id: string; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timelineError, setTimelineError] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [editError, setEditError] = useState('');
  // Yalnız başarıyla okunmuş veri yeniden yazılır. Okuma başarısızsa ya da henüz bitmediyse yazma reddedilir;
  // böylece boş sanılan liste diskteki kayıtların üzerine yazılmaz.
  const ready = useRef(new Set<Store>());
  const reload = useRef<() => void>(() => {});
  const badgesSynced = useRef(false);
  // Veri bu arada başka bir sekmede değiştiyse yazma reddedilir (StorageConflictError): güncel hal
  // yeniden okunur ve kullanıcıdan işlemi tekrarlaması istenir.
  async function guardedSave<T>(store: Store, save: (value: T) => Promise<void>, value: T) {
    if (!ready.current.has(store)) throw new Error(`${store} yüklenmeden yazılamaz`);
    try {
      await save(value);
    } catch (cause) {
      if (cause instanceof StorageConflictError) {
        setSyncNotice('Veriler başka bir sekmede değişmişti; güncel hali yüklendi. Son işlemi tekrar dene.');
        reload.current();
      }
      throw cause;
    }
  }
  const persistEntries = (value: Entry[]) => guardedSave('entries', saveEntries, value);
  const persistHabits = (value: Habit[]) => guardedSave('habits', saveHabits, value);
  const persistHabitCounts = (value: HabitCounts) => guardedSave('habitCounts', saveHabitCounts, value);
  const persistReviews = (value: Reviews) => guardedSave('reviews', saveReviews, value);
  const persistTodos = (value: Todo[]) => guardedSave('todos', saveTodos, value);
  const persistBadges = (value: EarnedBadges) => guardedSave('badges', saveBadges, value);
  const totalXp = totalXpOf(entries);
  const quest = dailyQuest();
  const questDone = questDoneToday(entries);
  const streak = getStreak(entries);
  const today = todayEntries(entries);
  const routines = routinesProgress(habits, entries);
  const dueReviews = dueLearnings(entries, reviews);
  const todoList = visibleTodos(todos);
  const skillTotals = Object.entries(entries.reduce<Record<string, number>>((totals, entry) => {
    for (const award of entry.awards) totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
    return totals;
  }, {})).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    const loaded = <T,>(store: Store, set: (value: T) => void) => (value: T) => { set(value); ready.current.add(store); };
    function loadAll() {
      loadEntries().then(loaded('entries', setEntries)).catch(() => setError('Kaydedilen anlar yüklenemedi. Verilerin silinmedi; sayfayı yenilemeyi dene.')).finally(() => setLoading(false));
      loadHabits().then(loaded('habits', setHabits)).catch(() => setHabitError('Rutinler yüklenemedi.'));
      loadHabitCounts().then(loaded('habitCounts', setHabitCounts)).catch(() => {});
      loadTodos().then(loaded('todos', setTodos)).catch(() => setTodoError('Yapılacaklar yüklenemedi.'));
      loadReviews().then(loaded('reviews', setReviews)).catch(() => {});
      loadBadges().then(loaded('badges', setEarnedBadges)).catch(() => {});
    }
    reload.current = loadAll;
    // Önce bekleyen veri göçleri (bkz. migrations.ts); başarısız olsa da veriler okunur.
    runMigrations().catch(cause => { if (__DEV__) console.warn('[göç] tamamlanamadı', cause); }).finally(loadAll);
    loadReminder().then(setReminderState).catch(() => {}).finally(() => setReminderLoaded(true));
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    // Uygulama iki sekmede açıksa birinin yazdığı veri ötekinin eski haliyle ezilmesin: değişince baştan okunur.
    const onStorage = (event: StorageEvent) => { if (!event.key || event.key.startsWith('skill-journey:')) loadAll(); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Kayıtlarla açılan rozetler kalıcı listeye yazılır; kayıt silinse de rozet geri alınmaz.
  // İlk eşitlemede (kalıcı listeden önce kazanılmış rozetler) tarih bilinmediği için boş bırakılır.
  useEffect(() => {
    if (!ready.current.has('entries') || !ready.current.has('badges')) return;
    const next = withEarnedBadges(entries, earnedBadges, badgesSynced.current ? new Date().toISOString() : '');
    badgesSynced.current = true;
    if (next) persistBadges(next).then(() => setEarnedBadges(next)).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries, earnedBadges]);

  // Rutinler, tikler ya da saat değişince önümüzdeki günlerin hatırlatmaları yeniden kurulur.
  useEffect(() => {
    if (!remindersSupported || loading || !reminderLoaded) return;
    syncReminders(reminder, habits, entries)
      .catch(error => { if (__DEV__) console.warn('[hatırlatıcı] kurulamadı', error); });
  }, [reminder, habits, entries, loading, reminderLoaded]);

  async function testReminder() {
    setReminderNotice('');
    setReminderNotice(await sendTestReminder().catch(() => 'Test bildirimi gönderilemedi.'));
  }

  async function setReminder(next: ReminderSettings) {
    setReminderError('');
    setReminderNotice('');
    try {
      if (next.enabled && !(await ensureReminderPermission())) {
        setReminderError('Bildirim izni verilmedi. Telefonun Ayarlar > Bildirimler bölümünden açabilirsin.');
        return;
      }
      await saveReminder(next);
      setReminderState(next);
    } catch {
      setReminderError('Hatırlatıcı ayarlanamadı. Lütfen tekrar dene.');
    }
  }

  // Elle yazılan kayıt, rutin tiki, öğrenilen kavram ve tekrar oturumu buradan geçer:
  // aynı XP, seri, hedef ve rozet hesabı. Oluşan kaydın kimliğini döner.
  async function recordEntry(description: string, result: Analysis, extra: Pick<Entry, 'habitId' | 'measures' | 'learning' | 'review' | 'amount'> = {}) {
    const knownSkills = new Set(entries.flatMap(entry => entry.awards.map(award => award.skill)));
    const previousSkillXp = entries.flatMap(entry => entry.awards).reduce<Record<string, number>>((totals, award) => {
      totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
      return totals;
    }, {});
    const bonusXp = !questDone && result.awards.some(award => isWithin(award.skill, quest.skill)) ? quest.bonus : 0;
    // tz: kaydın yazıldığı saat dilimi; gün hesabının ileride bu güne sabitlenebilmesi için saklanır.
    const next: Entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone, description, ...result, ...(bonusXp ? { bonusXp } : {}), ...extra };
    const updated = [next, ...entries];
    await persistEntries(updated);
    const newLevel = level(totalXp + result.xp + bonusXp);
    const nextReward: Reward = {
      id: next.id,
      kind: extra.learning ? 'learning' : extra.review ? 'review' : extra.habitId ? 'habit' : 'moment',
      analysis: result,
      bonusXp,
      newSkills: result.awards.filter(award => !knownSkills.has(award.skill)).map(award => award.skill),
      leveledSkills: result.awards.filter(award => level((previousSkillXp[award.skill] ?? 0) + award.xp) > level(previousSkillXp[award.skill] ?? 0)).map(award => award.skill),
      leveledUp: newLevel > level(totalXp),
      newLevel,
      newBadges: newlyUnlocked(entries, updated, earnedBadges),
      streak: getStreak(updated).count,
      streakExtended: !streak.activeToday,
      goalReached: today.length < DAILY_GOAL && today.length + 1 >= DAILY_GOAL,
      routinesComplete: !routines.complete && routinesProgress(habits, updated).complete,
    };
    setEntries(updated);
    setReward(nextReward);
    if (nextReward.leveledUp) setLevelUpShown(newLevel);
    rewardFeedback(nextReward);
    return next.id;
  }

  async function addLearning(term: string, meaning: string): Promise<boolean> {
    const learning = { term: term.trim().replace(/\s+/g, ' '), meaning: meaning.trim().replace(/\s+/g, ' ') };
    const problem = learningError(learning.term, learning.meaning, entries);
    if (problem) { setLearnError(problem); return false; }
    if (busy) return false;
    setBusy(true);
    setLearnError('');
    setReward(null);
    setEditNotice(null);
    try {
      // İlk tekrar ertesi gün; ayrıca kaydetmeye gerek yok (reviewStateOf kayıt tarihinden hesaplar).
      await recordEntry(learningDescription(learning), learningAnalysis(), { learning });
      return true;
    } catch {
      setLearnError('Kaydedilemedi. Lütfen tekrar dene.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Hatırlanan her kavram günün tek tekrar kaydına +REVIEW_XP ekler; unutulan ertesi güne döner.
  async function reviewLearning(entry: Entry, remembered: boolean) {
    if (busy) return;
    setBusy(true);
    setLearnError('');
    try {
      const nextReviews = { ...reviews, [entry.id]: nextReview(reviewStateOf(entry, reviews), remembered) };
      await persistReviews(nextReviews);
      setReviews(nextReviews);
      if (!remembered) { tap(); return; }
      const existing = reviewEntryToday(entries);
      if (!existing?.review) {
        setReward(null);
        await recordEntry(reviewDescription(1), reviewAnalysis(1), { review: { count: 1 } });
        return;
      }
      const count = existing.review.count + 1;
      const updated = entries.map(item => item.id === existing.id ? { ...item, ...reviewAnalysis(count), description: reviewDescription(count), review: { count } } : item);
      await persistEntries(updated);
      setEntries(updated);
      if (level(totalXp + REVIEW_XP) > level(totalXp)) setLevelUpShown(level(totalXp + REVIEW_XP));
      coin();
    } catch {
      setLearnError('Tekrar kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  async function addMoment() {
    const description = draft.trim();
    if (!description) { setError('Önce bugün yaptığın bir şeyi yaz.'); return; }
    if (isSameDayDuplicate(entries, description, localDay(new Date()))) {
      setError('Bunu bugün zaten ekledin.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setAnalyzing(true);
    setError('');
    // Önceki kaydın kartı yeni analiz sürerken ekranda kalmasın.
    setReward(null);
    setEditNotice(null);
    try {
      const result = await analyzeExperience(description, freeEntriesToday(entries));
      await recordEntry(description, result);
      // Analiz sırasında yeni bir şey yazılmaya başlandıysa onu silme.
      setDraft(current => current.trim() === description ? '' : current);
    } catch { setError('Bu an kaydedilemedi. Lütfen tekrar dene.'); }
    finally { setBusy(false); setAnalyzing(false); }
  }

  // Tik rutinine dokununca tik atılır (kayıt oluşur) ya da kaldırılır (bugünkü kaydı silinir).
  // Miktarlı rutin tikle değil, girilen miktarla güncellenir (setHabitAmount).
  async function toggleHabit(habit: Habit) {
    if (isAmountHabit(habit) || busy) return;
    setBusy(true);
    setHabitError('');
    setReward(null);
    setEditNotice(null);
    try {
      const done = routines.done.get(habit.id);
      if (done) {
        const updated = entries.filter(entry => entry.id !== done.id);
        await persistEntries(updated);
        setEntries(updated);
        tap();
      } else {
        await recordEntry(habit.title, habitAnalysis(habit), { habitId: habit.id });
      }
    } catch {
      setHabitError('Rutin güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  // Bugünkü kayıt, miktarlı rutinin yeni toplamına göre: hedefe (hedef yoksa ilk girişe) ulaşınca oluşur (XP),
  // sonra toplam değiştikçe metni ve miktarı güncellenir (XP değişmez), hedefin altına inince silinir.
  async function syncAmountEntry(habit: Habit, total: number, done: Entry | undefined) {
    const reached = amountReached(habit, total);
    const description = amountDescription(habit, total);
    const amount = { value: total, unit: habitGoal(habit).unit };
    if (reached && !done) { await recordEntry(description, habitAnalysis(habit), { habitId: habit.id, amount }); return; }
    if (done) {
      const updated = reached
        ? entries.map(entry => entry.id === done.id ? { ...entry, description, amount } : entry)
        : entries.filter(entry => entry.id !== done.id);
      await persistEntries(updated);
      setEntries(updated);
    }
    tap();
  }

  // Miktarlı rutinin bugünkü toplamını ayarlar ("İngilizce · 20 kelime"). Ekleme de düzeltme de bununla yapılır.
  async function setHabitAmount(habit: Habit, total: number): Promise<boolean> {
    if (busy) return false;
    if (!Number.isInteger(total) || total < 0 || total > MAX_AMOUNT) {
      setHabitError(`Miktar 0 ile ${formatAmount(MAX_AMOUNT)} arasında tam sayı olmalı.`);
      return false;
    }
    setBusy(true);
    setHabitError('');
    setReward(null);
    setEditNotice(null);
    try {
      const counts = { ...habitCounts, [habit.id]: { day: dayKey(new Date()), count: total } };
      await persistHabitCounts(counts);
      setHabitCounts(counts);
      await syncAmountEntry(habit, total, routines.done.get(habit.id));
      return true;
    } catch {
      setHabitError('Rutin güncellenemedi. Lütfen tekrar dene.');
      return false;
    } finally {
      setBusy(false);
    }
  }
  const habitCount = (habit: Habit) => habitCountToday(habitCounts, habit, routines.done.get(habit.id));

  // Rutini kullanıcı tanımlar: ad, isteğe bağlı birim ("kelime") ve günlük hedef. Beceri adından çıkarılır.
  async function addHabit(title: string, settings: { unit?: string; target?: number | null } = {}): Promise<boolean> {
    const clean = title.trim().replace(/\s+/g, ' ');
    const unit = settings.unit?.trim().replace(/\s+/g, ' ') ?? '';
    const target = settings.target || null;
    const problem = habitTitleError(clean, habits) ?? habitSettingsError(unit, target);
    if (problem) { setHabitError(problem); return false; }
    if (busy) return false;
    setBusy(true);
    setHabitError('');
    try {
      const skill = (await analyzeExperience(clean)).skill;
      const habit: Habit = { id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: clean, icon: '⭐', skill, createdAt: new Date().toISOString(), ...(unit ? { unit } : {}), ...(unit && target ? { target } : {}) };
      const updated = [...habits, habit];
      await persistHabits(updated);
      setHabits(updated);
      return true;
    } catch {
      setHabitError('Rutin eklenemedi. Lütfen tekrar dene.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Ad, simge, beceri, birim ya da günlük hedef değişir. Ad değişince (beceri ayrıca seçilmediyse) beceri addan
  // yeniden çıkarılır. Birim boşaltılırsa rutin tek tikli olur. Geçmiş kayıtlar eski haliyle kalır.
  async function updateHabit(id: string, changes: { title?: string; icon?: string; skill?: string; unit?: string; target?: number | null }): Promise<boolean> {
    const current = habits.find(habit => habit.id === id);
    if (!current || busy) return false;
    const title = changes.title?.trim().replace(/\s+/g, ' ') ?? current.title;
    const renamed = title !== current.title;
    const unit = changes.unit === undefined ? current.unit?.trim() ?? '' : changes.unit.trim().replace(/\s+/g, ' ');
    const target = changes.target === undefined ? current.target ?? null : changes.target || null;
    const problem = (renamed ? habitTitleError(title, habits.filter(habit => habit.id !== id)) : null) ?? habitSettingsError(unit, unit ? target : null);
    if (problem) { setHabitError(problem); return false; }
    setBusy(true);
    setHabitError('');
    try {
      const skill = changes.skill ?? (renamed ? (await analyzeExperience(title)).skill : current.skill);
      const { unit: _unit, target: _target, ...rest } = current;
      const next: Habit = { ...rest, title, skill, icon: changes.icon ?? current.icon, ...(unit ? { unit } : {}), ...(unit && target ? { target } : {}) };
      const updated = habits.map(habit => habit.id === id ? next : habit);
      await persistHabits(updated);
      setHabits(updated);
      // Miktarlı rutinde bugünkü toplam yeni hedefe ve birime göre yeniden değerlendirilir.
      if (isAmountHabit(next) && (changes.unit !== undefined || changes.target !== undefined)) {
        const done = routines.done.get(id);
        await syncAmountEntry(next, habitCountToday(habitCounts, current, done), done);
      }
      return true;
    } catch {
      setHabitError('Rutin güncellenemedi. Lütfen tekrar dene.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Rutin listeden kalkar; geçmişte attığın tikler (kayıtlar) ve kazandığın XP silinmez.
  async function removeHabit(id: string) {
    if (busy) return;
    try {
      const updated = habits.filter(habit => habit.id !== id);
      await persistHabits(updated);
      setHabits(updated);
    } catch {
      setHabitError('Rutin kaldırılamadı. Lütfen tekrar dene.');
    }
  }

  async function addTodo(title: string): Promise<boolean> {
    const problem = todoTitleError(title, todos);
    if (problem) { setTodoError(problem); return false; }
    if (busy) return false;
    setBusy(true);
    setTodoError('');
    try {
      const todo: Todo = { id: `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: cleanTodoTitle(title), createdAt: new Date().toISOString() };
      const updated = [...todos, todo];
      await persistTodos(updated);
      setTodos(updated);
      return true;
    } catch {
      setTodoError('Eklenemedi. Lütfen tekrar dene.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Tamamlanan iş, elle yazılmış gibi bugünün kaydı olur: beceriler işin adından çıkarılır, XP ve seri işler.
  async function completeTodo(todo: Todo) {
    if (busy || todo.doneAt) return;
    if (isSameDayDuplicate(entries, todo.title, localDay(new Date()))) {
      setTodoError('Bunu bugün zaten kaydettin.');
      return;
    }
    setBusy(true);
    setAnalyzing(true);
    setTodoError('');
    setReward(null);
    setEditNotice(null);
    try {
      const result = await analyzeExperience(todo.title, freeEntriesToday(entries));
      const entryId = await recordEntry(todo.title, result);
      const updated = todos.map(item => item.id === todo.id ? { ...item, doneAt: new Date().toISOString(), entryId } : item);
      await persistTodos(updated);
      setTodos(updated);
    } catch {
      setTodoError('İş tamamlanamadı. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
      setAnalyzing(false);
    }
  }

  // Tik geri alınınca iş yeniden açılır ve oluşturduğu kayıt (XP'siyle) silinir.
  async function reopenTodo(todo: Todo) {
    if (busy) return;
    setBusy(true);
    setTodoError('');
    setReward(null);
    setEditNotice(null);
    try {
      const updated = todos.map(item => item.id === todo.id ? { id: item.id, title: item.title, createdAt: item.createdAt } : item);
      await persistTodos(updated);
      setTodos(updated);
      if (todo.entryId && entries.some(entry => entry.id === todo.entryId)) {
        const remaining = entries.filter(entry => entry.id !== todo.entryId);
        await persistEntries(remaining);
        setEntries(remaining);
      }
      tap();
    } catch {
      setTodoError('İş geri alınamadı. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  // İş listeden kalkar; tamamlanmışsa oluşturduğu kayıt ve XP Anılar'da kalır.
  async function removeTodo(id: string) {
    if (busy) return;
    try {
      const updated = todos.filter(todo => todo.id !== id);
      await persistTodos(updated);
      setTodos(updated);
    } catch {
      setTodoError('İş silinemedi. Lütfen tekrar dene.');
    }
  }

  async function deleteMoment(id: string) {
    if (busy) return;
    setBusy(true);
    setTimelineError('');
    try {
      const updated = entries.filter(entry => entry.id !== id);
      await persistEntries(updated);
      setEntries(updated);
      // Bugün tamamlanan bir işin kaydı silinirse iş yeniden açılır (rutin tikinin kalkması gibi).
      const linked = todoList.doneToday.find(todo => todo.entryId === id);
      if (linked) {
        const reopened = todos.map(todo => todo.id === linked.id ? { id: todo.id, title: todo.title, createdAt: todo.createdAt } : todo);
        await persistTodos(reopened);
        setTodos(reopened);
      }
      setReward(null);
      setEditNotice(null);
      setConfirmDeleteId(null);
    } catch {
      setTimelineError('Kayıt silinemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  function startEditing(entry: Entry) {
    setEditingId(entry.id);
    setEditDraft(entry.description);
    setEditError('');
    setEditNotice(null);
    setConfirmDeleteId(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft('');
    setEditError('');
  }

  async function saveEdit(id: string) {
    const description = editDraft.trim();
    if (!description) { setEditError('Kayıt boş olamaz.'); return; }
    const editing = entries.find(entry => entry.id === id);
    if (editing && isSameDayDuplicate(entries, description, entryDay(editing), id)) {
      setEditError('Aynı gün içinde bu kayıt zaten var.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setEditError('');
    try {
      const result = await analyzeExperience(description);
      const before = entries.find(entry => entry.id === id);
      const previousXp = before?.xp ?? result.xp;
      const awards = capAwards(result.awards, previousXp);
      const xp = awards.reduce((sum, award) => sum + award.xp, 0);
      const updated = entries.map(entry => entry.id === id ? withQuestCheck({ ...entry, description, ...result, skill: awards[0].skill, awards, xp }) : entry);
      await persistEntries(updated);
      setEntries(updated);
      setReward(null);
      cancelEditing();
      const skills = awards.map(award => displaySkill(award.skill)).join(' · ');
      const xpNote = xp < previousXp ? `XP ${previousXp} → ${xp}.`
        : result.xp > previousXp ? `XP ${previousXp} olarak kaldı; düzenleme XP artırmaz.`
        : `XP değişmedi (${xp}).`;
      setEditNotice({ id, text: `Güncellendi: ${skills}. ${xpNote}` });
    } catch {
      setEditError('Değişiklikler kaydedilemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

  async function correctAward(entryId: string, fromSkill: string, toSkill: string) {
    if (busy) throw new Error('Başka bir işlem sürüyor.');
    if (!entries.some(entry => entry.id === entryId)) throw new Error('Kayıt bulunamadı.');
    setBusy(true);
    try {
      const updated = entries.map(entry => entry.id === entryId
        ? withQuestCheck(correctSkillAward(entry, fromSkill, toSkill))
        : entry);
      await persistEntries(updated);
      setEntries(updated);
    } finally {
      setBusy(false);
    }
  }

  // Önerilen bir beceriyi kayıttan çıkarır (XP'siyle). Ödül kartı kaydın güncel halini gösterir.
  async function rejectAward(entryId: string, skill: string) {
    if (busy) throw new Error('Başka bir işlem sürüyor.');
    const target = entries.find(entry => entry.id === entryId);
    if (!target) throw new Error('Kayıt bulunamadı.');
    const changed = withQuestCheck(removeSkillAward(target, skill));
    setBusy(true);
    try {
      const updated = entries.map(entry => entry.id === entryId ? changed : entry);
      await persistEntries(updated);
      setEntries(updated);
    } finally {
      setBusy(false);
    }
  }


  return { earnedBadges,syncNotice,dismissSyncNotice: () => setSyncNotice(''),todoList,todoError,setTodoError,addTodo,completeTodo,reopenTodo,removeTodo,reviews,dueReviews,learnError,setLearnError,addLearning,reviewLearning,reminder,setReminder,reminderError,reminderNotice,testReminder,habits,routines,habitError,setHabitError,toggleHabit,setHabitAmount,habitCount,addHabit,updateHabit,removeHabit,analyzing,editNotice,entries,draft,setDraft,reward,levelUpShown,dismissLevelUp: () => setLevelUpShown(null),quest,questDone,streak,today,busy,loading,error,setError,timelineError,confirmDeleteId,setConfirmDeleteId,editingId,editDraft,setEditDraft,editError,setEditError,totalXp,skillTotals,addMoment,deleteMoment,startEditing,cancelEditing,saveEdit,correctAward,rejectAward };
}
const JourneyContext = createContext<ReturnType<typeof useJourneyState> | null>(null);
export function JourneyProvider({ children }: { children: ReactNode }) {
  const state = useJourneyState();
  return <JourneyContext value={state}>{children}</JourneyContext>;
}
export function useJourney() {
  const state = use(JourneyContext);
  if (!state) throw new Error('JourneyProvider is required');
  return state;
}
