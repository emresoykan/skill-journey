import { createContext, use, useEffect, useState, type ReactNode } from 'react';
import { analyzeExperience, type Analysis } from './mockAnalysis';
import { loadEntries, saveEntries, type Entry } from './storage';
import { correctSkillAward } from './skillCorrections';
import { DAILY_GOAL, dailyQuest, getStreak, isToday, level, newlyUnlocked, questDoneToday, todayEntries, totalXpOf, type Badge } from './game';
import { rewardFeedback } from './feedback';
export type Reward = { id: string; analysis: Analysis; bonusXp: number; newSkills: string[]; leveledSkills: string[]; leveledUp: boolean; newLevel: number; newBadges: Badge[]; streak: number; streakExtended: boolean; goalReached: boolean };
const normalizeDescription = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');
// Aynı şey farklı günlerde tekrar yazılabilir ("30 dk yürüdüm"); yalnızca aynı gün içinde tekrar engellenir.
const isSameDayDuplicate = (entries: Entry[], description: string, day: string, exceptId?: string) =>
  entries.some(entry => entry.id !== exceptId && isToday(entry.createdAt, new Date(day)) && normalizeDescription(entry.description) === normalizeDescription(description));
function useJourneyState() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [draft, setDraft] = useState('');
  const [reward, setReward] = useState<Reward | null>(null);
  const [levelUpShown, setLevelUpShown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
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
  const skillTotals = Object.entries(entries.reduce<Record<string, number>>((totals, entry) => {
    for (const award of entry.awards) totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
    return totals;
  }, {})).sort((a, b) => b[1] - a[1]);

  useEffect(() => {
    loadEntries().then(setEntries).catch(() => setError('Kaydedilen anlar yüklenemedi.')).finally(() => setLoading(false));
  }, []);

  async function addMoment() {
    const description = draft.trim();
    if (!description) { setError('Önce bugün yaptığın bir şeyi yaz.'); return; }
    if (isSameDayDuplicate(entries, description, new Date().toISOString())) {
      setError('Bunu bugün zaten ekledin.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await analyzeExperience(description);
      const knownSkills = new Set(entries.flatMap(entry => entry.awards.map(award => award.skill)));
      const previousSkillXp = entries.flatMap(entry => entry.awards).reduce<Record<string, number>>((totals, award) => {
        totals[award.skill] = (totals[award.skill] ?? 0) + award.xp;
        return totals;
      }, {});
      const bonusXp = !questDone && result.awards.some(award => award.skill === quest.skill) ? quest.bonus : 0;
      const next: Entry = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: new Date().toISOString(), description, ...result, ...(bonusXp ? { bonusXp } : {}) };
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
      };
      setEntries(updated);
      setReward(nextReward);
      if (nextReward.leveledUp) setLevelUpShown(newLevel);
      rewardFeedback(nextReward);
      // Analiz sırasında yeni bir şey yazılmaya başlandıysa onu silme.
      setDraft(current => current.trim() === description ? '' : current);
    } catch { setError('Bu an kaydedilemedi. Lütfen tekrar dene.'); }
    finally { setBusy(false); }
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
      const updated = entries.map(entry => entry.id === id ? { ...entry, description, ...result } : entry);
      await saveEntries(updated);
      setEntries(updated);
      setReward(null);
      cancelEditing();
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


  return { entries,draft,setDraft,reward,levelUpShown,dismissLevelUp: () => setLevelUpShown(null),quest,questDone,streak,today,busy,loading,error,setError,timelineError,confirmDeleteId,setConfirmDeleteId,editingId,editDraft,setEditDraft,editError,setEditError,totalXp,skillTotals,addMoment,deleteMoment,startEditing,cancelEditing,saveEdit,correctAward };
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
