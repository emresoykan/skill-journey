import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DEFAULT_REMINDER, type ReminderSettings } from './routines';

// Telefon sürümü. Web sürümü reminders.ts'te: expo-notifications web'i desteklemez
// ve içe aktarıldığında konsola uyarı basar, bu yüzden web paketine hiç girmez.
export const remindersSupported = true;

const KEY = 'skill-journey:reminder:v1';
const CHANNEL = 'reminders';

// Uygulama açıkken gelen hatırlatma da görünsün.
Notifications.setNotificationHandler({
  handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
});

export async function loadReminder(): Promise<ReminderSettings> {
  const stored = await AsyncStorage.getItem(KEY);
  if (!stored) return DEFAULT_REMINDER;
  const parsed: Partial<ReminderSettings> = JSON.parse(stored);
  const valid = typeof parsed.enabled === 'boolean'
    && Number.isInteger(parsed.hour) && parsed.hour! >= 0 && parsed.hour! < 24
    && Number.isInteger(parsed.minute) && parsed.minute! >= 0 && parsed.minute! < 60;
  return valid ? parsed as ReminderSettings : DEFAULT_REMINDER;
}

export async function saveReminder(settings: ReminderSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(settings));
}

const isAllowed = (status: Notifications.NotificationPermissionsStatus) =>
  status.granted || status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;

export async function ensureReminderPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  if (isAllowed(current)) return true;
  if (!current.canAskAgain) return false;
  return isAllowed(await Notifications.requestPermissionsAsync());
}

// Uygulamanın kurduğu tek bildirim türü bu olduğu için önce hepsi silinip plan baştan kurulur.
export async function applyReminderPlan(plan: { date: Date; body: string }[]): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL, { name: 'Rutin hatırlatıcıları', importance: Notifications.AndroidImportance.DEFAULT });
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
  for (const item of plan) {
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Rutin zamanı', body: item.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: item.date, channelId: CHANNEL },
    });
  }
}
