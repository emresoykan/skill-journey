import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { reminderPlan, type Habit, type ReminderSettings } from './routines';
import type { Entry } from './storage';

// Telefon sürümü: bildirimler telefonun kendisinde zamanlanır, sunucu gerekmez.
// Web sürümü reminders.ts'te (web push); Metro platforma göre birini seçer.
export { loadReminder, saveReminder } from './reminderStore';
export const remindersSupported = true;
export const reminderNote: string | null = null;

const CHANNEL = 'reminders';

// Uygulama açıkken gelen hatırlatma da görünsün.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

const isAllowed = (status: Notifications.NotificationPermissionsStatus) =>
  status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (isAllowed(current)) return true;
  if (!current.canAskAgain) return false;
  return isAllowed(await Notifications.requestPermissionsAsync());
}

async function ensureChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Rutin hatırlatıcıları', importance: Notifications.AndroidImportance.DEFAULT });
  }
}

// Önümüzdeki günlerin hatırlatmaları baştan kurulur. Uygulamanın kurduğu tek bildirim
// türü bu olduğu için önce hepsi silinir.
export async function syncReminders(settings: ReminderSettings, habits: Habit[], entries: Entry[]): Promise<void> {
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of reminderPlan(settings, habits, entries)) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Rutin zamanı', body: item.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: CHANNEL },
    });
  }
}

export async function sendTestReminder(): Promise<string> {
  if (!(await ensureReminderPermission())) return 'Bildirim izni yok. Telefonun Ayarlar > Bildirimler bölümünden açabilirsin.';
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: { title: 'Skill Journey', body: 'Bildirimler çalışıyor 🎉 Rutin hatırlatmaların böyle gelecek.' },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 5, channelId: CHANNEL },
  });
  return 'Test bildirimi 5 saniye içinde gelecek.';
}
