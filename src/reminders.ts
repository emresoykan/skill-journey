import { DEFAULT_REMINDER, type ReminderSettings } from './routines';

// Web sürümü: tarayıcıda rutin hatırlatıcısı yok (sunucusuz zamanlanmış bildirim
// mümkün değil). Telefon sürümü reminders.native.ts'te; Metro platforma göre seçer.
export const remindersSupported = false;
export const loadReminder = async (): Promise<ReminderSettings> => DEFAULT_REMINDER;
export const saveReminder = async (_settings: ReminderSettings): Promise<void> => {};
export const ensureReminderPermission = async (): Promise<boolean> => false;
export const applyReminderPlan = async (_plan: { date: Date; body: string }[]): Promise<void> => {};
