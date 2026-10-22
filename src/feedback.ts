import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { playSound, type Sound } from './sounds';

// Titreşim yalnızca his katmanı: desteklenmeyen cihazda sessizce atlanır.
function run(effect: () => Promise<void>) {
  if (Platform.OS === 'web') return;
  try { effect().catch(() => {}); } catch {}
}

export function tap() {
  playSound('tap');
  run(() => Haptics.selectionAsync());
}

// Küçük kazanım: tekrar oturumunda hatırlanan her kavram.
export function coin() {
  playSound('xp');
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

type RewardEvent = { leveledUp: boolean; newBadges: unknown[]; bonusXp: number; goalReached: boolean; routinesComplete: boolean };

// Önce XP jetonu, ardından anın en büyük ödülü için ikinci bir ses gelir.
export function rewardFeedback(reward: RewardEvent) {
  playSound('xp');
  const big = reward.leveledUp || reward.newBadges.length > 0 || reward.goalReached || reward.routinesComplete;
  run(() => big
    ? Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
  const follow: Sound | null = reward.leveledUp ? 'levelup' : reward.newBadges.length || reward.goalReached || reward.routinesComplete ? 'badge' : reward.bonusXp ? 'quest' : null;
  if (follow) setTimeout(() => playSound(follow), 420);
}
