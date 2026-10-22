import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { analyzeExperience, displaySkill, type Analysis } from './mockAnalysis';
import { loadEntries, loadHabits, saveEntries, saveHabits, type Entry } from './storage';
import { DEFAULT_REMINDER, habitAnalysis, habitTitleError, routinesProgress, type Habit, type HabitPreset, type ReminderSettings } from './routines';
import { ensureReminderPermission, loadReminder, remindersSupported, saveReminder, sendTestReminder, syncReminders } from './reminders';
import { capAwards, correctSkillAward } from './skillCorrections';
import { DAILY_GOAL, dailyQuest, getStreak, isToday, level, newlyUnlocked, questDoneToday, todayEntries, totalXpOf, type Badge } from './game';
import { rewardFeedback, tap } from './feedback';
export type Reward = { id: string; analysis: Analysis; bonusXp: number; newSkills: string[]; leveledSkills: string[]; leveledUp: boolean; newLevel: number; newBadges: Badge[]; streak: number; streakExtended: boolean; goalReached: boolean; routinesComplete: boolean };
const normalizeDescription = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
// Aynı şey farklı günlerde tekrar yazılabilir ("30 dk yürüdüm"); yalnızca aynı gün içinde tekrar engellenir.
const isSameDayDuplicate = (entries: Entry[], description: string, day: string, exceptId?: string) =>
  entries.some(entry => entry.id !== exceptId && isToday(entry.createdAt, new Date(day)) && normalizeDescription(entry.description) === normalizeDescription(description));
function useJourneyState() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [habitError, setHabitError] = useState('');
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
  const skillTotals = Object.entries(entries.reduce<Record<string, number>>((totals, entry) => {
    for (const award of entry.awards) totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
    return totals;
  }, {})).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    loadEntries().then(setEntries).catch(() => setError('Kaydedilen anlar yüklenemedi.')).finally(() => setLoading(false));
    loadHabits().then(setHabits).catch(() => setHabitError('Rutinler yüklenemedi.'));
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

  // Elle yazılan kayıt da rutin tiki de buradan geçer: aynı XP, seri, hedef ve rozet hesabı.
  async function recordEntry(description: string, result: Analysis, habitId?: string) {
    const knownSkills = new Set(entries.flatMap(entry => entry.awards.map(award => award.skill)));
    const previousSkillXp = entries.flatMap(entry => entry.awards).reduce<Record<string, number>>((totals, award) => {
      totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
      return totals;
    }, {});
    const bonusXp = !questDone && result.awards.some(award => award.skill === quest.skill) ? quest.bonus : 0;
    const next: Entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), description, ...result, ...(bonusXp ? { bonusXp } : {}), ...(habitId ? { habitId } : {}) };
    const updated = [next, ...entries];
    await saveEntries(updated);
    const newLevel = level(totalXp + result.xp + bonusXp);
    const nextReward: Reward = {
      id: next.id,
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
  async function toggleHabit(habit: Habit) {
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
        await recordEntry(habit.title, habitAnalysis(habit), habit.id);
      }
    } catch {
      setHabitError('Rutin güncellenemedi. Lütfen tekrar dene.');
    } finally {
      setBusy(false);
    }
  }

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
      const habit: Habit = { id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, title: clean, icon: preset?.icon ?? '⭐', skill, createdAt: new Date().toISOString() };
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


  return { reminder,setReminder,reminderError,reminderNotice,testReminder,habits,routines,habitError,setHabitError,toggleHabit,addHabit,removeHabit,analyzing,editNotice,entries,draft,setDraft,reward,levelUpShown,dismissLevelUp: () => setLevelUpShown(null),quest,questDone,streak,today,busy,loading,error,setError,timelineError,confirmDeleteId,setConfirmDeleteId,editingId,editDraft,setEditDraft,editError,setEditError,totalXp,skillTotals,addMoment,deleteMoment,startEditing,cancelEditing,saveEdit,correctAward };
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
