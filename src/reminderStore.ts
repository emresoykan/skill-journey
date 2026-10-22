import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_REMINDER, type ReminderSettings } from './routines';

// Hatırlatıcı ayarı (açık/kapalı ve saat); telefon ve web sürümü ortak kullanır.
const KEY = 'skill-journey:reminder:v1';

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
