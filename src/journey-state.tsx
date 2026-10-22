import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { analyzeExperience, displaySkill, type Analysis } from './mockAnalysis';
import { loadEntries, loadHabitCounts, loadHabits, loadReviews, saveEntries, saveHabitCounts, saveHabits, saveReviews, type Entry } from './storage';
import { dueLearnings, learningAnalysis, learningDescription, learningError, nextReview, reviewAnalysis, reviewDescription, reviewEntryToday, reviewStateOf, REVIEW_XP, type Reviews } from './learning';
import { dayKey, DEFAULT_REMINDER, habitAnalysis, habitCountToday, habitGoal, habitPresets, habitTitleError, MAX_TARGET, normalizeTitle, routinesProgress, type Habit, type HabitCounts, type HabitPreset, type ReminderSettings } from './routines';
import { ensureReminderPermission, loadReminder, remindersSupported, saveReminder, sendTestReminder, syncReminders } from './reminders';
import { capAwards, correctSkillAward } from './skillCorrections';
import { DAILY_GOAL, dailyQuest, getStreak, isToday, level, newlyUnlocked, questDoneToday, todayEntries, totalXpOf, type Badge } from './game';
import { coin, rewardFeedback, tap } from './feedback';
export type RewardKind = 'moment' | 'habit' | 'learning' | 'review';
export type Reward = { id: string; kind: RewardKind; analysis: Analysis; bonusXp: number; newSkills: string[]; leveledSkills: string[]; leveledUp: boolean; newLevel: number; newBadges: Badge[]; streak: number; streakExtended: boolean; goalReached: boolean; routinesComplete: boolean };
const normalizeDescription = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
// Aynı şey farklı günlerde tekrar yazılabilir ("30 dk yürüdüm"); yalnızca aynı gün içinde tekrar engellenir.
const isSameDayDuplicate = (entries: Entry[], description: string, day: string, exceptId?: string) =>
  entries.some(entry => entry.id !== exceptId && isToday(entry.createdAt, new Date(day)) && normalizeDescription(entry.description) === normalizeDescription(description));
function useJourneyState() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitError, setHabitError] = useState('');
  const [habitCounts, setHabitCounts] = useState<HabitCounts>({});
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
  const totalXp = totalXpOf(entries);
  const quest = dailyQuest();
  const questDone = questDoneToday(entries);
  const streak = getStreak(entries);
  const today = todayEntries(entries);
  const routines = routinesProgress(habits, entries);
  const dueReviews = dueLearnings(entries, reviews);
  const skillTotals = Object.entries(entries.reduce<Record<string, number>>((totals, entry) => {
    for (const award of entry.awards) totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
    return totals;
  }, {})).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    loadEntries().then(setEntries).catch(() => setError('Kaydedilen anlar yüklenemedi.')).finally(() => setLoading(false));
    loadHabits().then(setHabits).catch(() => setHabitError('Rutinler yüklenemedi.'));
    loadHabitCounts().then(setHabitCounts).catch(() => {});
    loadReviews().then(setReviews).catch(() => {});
    loadReminder().then(setReminderState).catch(() => {}).finally(() => setReminderLoaded(true));
  }, []);

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
  async function recordEntry(description: string, result: Analysis, extra: Pick<Entry, 'habitId' | 'learning' | 'review'> = {}) {
    const knownSkills = new Set(entries.flatMap(entry => entry.awards.map(award => award.skill)));
    const previousSkillXp = entries.flatMap(entry => entry.awards).reduce<Record<string, number>>((totals, award) => {
      totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
      return totals;
    }, {});
    const bonusXp = !questDone && result.awards.some(award => award.skill === quest.skill) ? quest.bonus : 0;
    const next: Entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), description, ...result, ...(bonusXp ? { bonusXp } : {}), ...extra };
    const updated = [next, ...entries];
    await saveEntries(updated);
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
      newBadges: newlyUnlocked(entries, updated),
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
      await saveReviews(nextReviews);
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
      await saveEntries(updated);
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
    if (isSameDayDuplicate(entries, description, new Date().toISOString())) {
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
      const result = await analyzeExperience(description);
      await recordEntry(description, result);
      // Analiz sırasında yeni bir şey yazılmaya başlandıysa onu silme.
      setDraft(current => current.trim() === description ? '' : current);
    } catch { setError('Bu an kaydedilemedi. Lütfen tekrar dene.'); }
    finally { setBusy(false); setAnalyzing(false); }
  }

  // Rutine dokununca tik atılır (kayıt oluşur) ya da tik kaldırılır (bugünkü kaydı silinir).
  // Sayılı rutinde (ör. 8 bardak su) her dokunuş bir artırır; tik hedefe ulaşınca atılır.
  async function toggleHabit(habit: Habit) {
    if (habitGoal(habit).target > 1) return stepHabit(habit, 1);
    if (busy) return;
    setBusy(true);
    setHabitError('');
    setReward(null);
    setEditNotice(null);
    try {
      const done = routines.done.get(habit.id);
      if (done) {
        const updated = entries.filter(entry => entry.id !== done.id);
        await saveEntries(updated);
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

  // Sayılı rutinin bugünkü sayısını bir artırır ya da azaltır. Hedefe ulaşınca kayıt (XP) oluşur;
  // hedefin altına inince bugünkü kayıt silinir.
  async function stepHabit(habit: Habit, delta: 1 | -1) {
    if (busy) return;
    const { target } = habitGoal(habit);
    const done = routines.done.get(habit.id);
    const count = habitCountToday(habitCounts, habit, !!done);
    const next = Math.max(0, Math.min(target, count + delta));
    if (next === count) return;
    setBusy(true);
    setHabitError('');
    setReward(null);
    setEditNotice(null);
    try {
      const counts = { ...habitCounts, [habit.id]: { day: dayKey(new Date()), count: next } };
      await saveHabitCounts(counts);
      setHabitCounts(counts);
      if (next >= target && !done) await recordEntry(habit.title, habitAnalysis(habit), { habitId: habit.id });
      else {
        if (next < target && done) {
          const updated = entries.filter(entry => entry.id !== done.id);
          await saveEntries(updated);
          setEntries(updated);
        }
        tap();
      }
    } catch {
      setHabitError('Rutin güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }
  const habitCount = (habit: Habit) => habitCountToday(habitCounts, habit, routines.done.has(habit.id));

  async function addHabit(title: string, preset?: HabitPreset): Promise<boolean> {
    const clean = title.trim().replace(/\s+/g, ' ');
    const problem = habitTitleError(clean, habits);
    if (problem) { setHabitError(problem); return false; }
    if (busy) return false;
    setBusy(true);
    setHabitError('');
    try {
      // Hazır rutinin becerisi bellidir; kendi yazdığın rutinin becerisi adından çıkarılır.
      const skill = preset?.skill ?? (await analyzeExperience(clean)).skill;
      const habit: Habit = { id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: clean, icon: preset?.icon ?? '⭐', skill, createdAt: new Date().toISOString(), ...(preset?.target ? { target: preset.target, unit: preset.unit } : {}) };
      const updated = [...habits, habit];
      await saveHabits(updated);
      setHabits(updated);
      return true;
    } catch {
      setHabitError('Rutin eklenemedi. Lütfen tekrar dene.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Ad, simge ya da günlük hedef değişir. Ad değişince beceri yeniden belirlenir: hazır öneriyle aynıysa
  // onun becerisi, değilse addan çıkarılan beceri. Geçmiş tikler eski adıyla kalır.
  async function updateHabit(id: string, changes: { title?: string; icon?: string; target?: number }): Promise<boolean> {
    const current = habits.find(habit => habit.id === id);
    if (!current || busy) return false;
    const title = changes.title?.trim().replace(/\s+/g, ' ') ?? current.title;
    const renamed = title !== current.title;
    if (renamed) {
      const problem = habitTitleError(title, habits.filter(habit => habit.id !== id));
      if (problem) { setHabitError(problem); return false; }
    }
    setBusy(true);
    setHabitError('');
    try {
      const preset = habitPresets.find(item => normalizeTitle(item.title) === normalizeTitle(title));
      const skill = !renamed ? current.skill : preset?.skill ?? (await analyzeExperience(title)).skill;
      // Hedef değişince birim korunur (hazır önerininki dahil: "Su iç" → bardak).
      const goal = changes.target === undefined ? null : { target: Math.max(1, Math.min(MAX_TARGET, changes.target)), unit: habitGoal(current).unit };
      const updated = habits.map(habit => habit.id === id ? { ...habit, title, skill, icon: changes.icon ?? habit.icon, ...goal } : habit);
      await saveHabits(updated);
      setHabits(updated);
      // Bugünkü sayı yeni hedefe göre yeniden değerlendirilir: hedef düşüp sayıya inince tik atılır,
      // hedef sayının üstüne çıkınca bugünkü tik geri alınır.
      if (goal) {
        const done = routines.done.get(id);
        const count = habitCountToday(habitCounts, current, !!done);
        const counts = { ...habitCounts, [id]: { day: dayKey(new Date()), count: Math.min(count, goal.target) } };
        await saveHabitCounts(counts);
        setHabitCounts(counts);
        if (count >= goal.target && !done && count > 0) await recordEntry(title, habitAnalysis({ ...current, skill }), { habitId: id });
        else if (count < goal.target && done) {
          const remaining = entries.filter(entry => entry.id !== done.id);
          await saveEntries(remaining);
          setEntries(remaining);
        }
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
      await saveHabits(updated);
      setHabits(updated);
    } catch {
      setHabitError('Rutin kaldırılamadı. Lütfen tekrar dene.');
    }
  }

  async function deleteMoment(id: string) {
    if (busy) return;
    setBusy(true);
    setTimelineError('');
    try {
      const updated = entries.filter(entry => entry.id !== id);
      await saveEntries(updated);
      setEntries(updated);
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
    if (editing && isSameDayDuplicate(entries, description, editing.createdAt, id)) {
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
      const updated = entries.map(entry => entry.id === id ? { ...entry, description, ...result, skill: awards[0].skill, awards, xp } : entry);
      await saveEntries(updated);
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
        ? correctSkillAward(entry, fromSkill, toSkill)
        : entry);
      await saveEntries(updated);
      setEntries(updated);
      setReward(null);
    } finally {
      setBusy(false);
    }
  }


  return { reviews,dueReviews,learnError,setLearnError,addLearning,reviewLearning,reminder,setReminder,reminderError,reminderNotice,testReminder,habits,routines,habitError,setHabitError,toggleHabit,stepHabit,habitCount,addHabit,updateHabit,removeHabit,analyzing,editNotice,entries,draft,setDraft,reward,levelUpShown,dismissLevelUp: () => setLevelUpShown(null),quest,questDone,streak,today,busy,loading,error,setError,timelineError,confirmDeleteId,setConfirmDeleteId,editingId,editDraft,setEditDraft,editError,setEditError,totalXp,skillTotals,addMoment,deleteMoment,startEditing,cancelEditing,saveEdit,correctAward };
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
