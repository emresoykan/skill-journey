import Constants from 'expo-constants';
import { PUSH_URL, VAPID_PUBLIC_KEY } from './pushConfig';
import { routinesProgress, type Habit, type ReminderSettings } from './routines';
import type { Entry } from './storage';

// Web sürümü: tarayıcı kapalıyken zamanlama yapamadığı için hatırlatmayı push-worker
// (Cloudflare Worker) gönderir. Buradan ona abonelik, saat ve bugün kalan rutin sayısı gider;
// kayıtların kendisi gitmez. Telefon sürümü reminders.native.ts'te.
export { loadReminder, saveReminder } from './reminderStore';

const BASE = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';
const ID_KEY = 'skill-journey:push-id';
const SYNCED_KEY = 'skill-journey:push-synced';

const hasPush = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
const isStandalone = typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);

export const remindersSupported = hasPush && !!PUSH_URL;
// iPhone'da Push API yalnız Ana Ekrana eklenmiş web uygulamasında açılır.
export const reminderNote: string | null = remindersSupported ? null
  : !PUSH_URL ? '🔔 Rutin hatırlatıcıları telefon uygulamasında çalışır.'
  : isIOS && !isStandalone ? '🔔 Bildirim için Safari’de Paylaş → Ana Ekrana Ekle ile siteyi ekle ve oradan aç.'
  : '🔔 Bu tarayıcı bildirimleri desteklemiyor.';

function storage(key: string, value?: string | null) {
  try {
    if (value === undefined) return localStorage.getItem(key);
    if (value === null) localStorage.removeItem(key); else localStorage.setItem(key, value);
  } catch {}
  return null;
}

function deviceId() {
  let id = storage(ID_KEY);
  if (!id) { id = crypto.randomUUID(); storage(ID_KEY, id); }
  return id;
}

async function post(path: string, body: object) {
  const response = await fetch(`${PUSH_URL}${path}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  return { status: response.status, data: await response.json().catch(() => ({})) as { ok?: boolean; status?: number | string } };
}

const keyBytes = (base64url: string) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(base64url.length / 4) * 4, '=');
  return Uint8Array.from(atob(base64), char => char.charCodeAt(0));
};

async function subscription() {
  const registration = await navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` });
  await navigator.serviceWorker.ready;
  return await registration.pushManager.getSubscription()
    ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) });
}

const localDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

// İzin isteği iPhone'da yalnız bir dokunuşa karşılık gösterilir; bu yüzden önce o çağrılır.
export async function ensureReminderPermission(): Promise<boolean> {
  if (!remindersSupported) return false;
  return (await Notification.requestPermission()) === 'granted';
}

export async function syncReminders(settings: ReminderSettings, habits: Habit[], entries: Entry[]): Promise<void> {
  if (!remindersSupported) return;
  const id = deviceId();
  if (!settings.enabled || habits.length === 0) {
    if (storage(SYNCED_KEY)) { await post('/unsubscribe', { id }); storage(SYNCED_KEY, null); }
    return;
  }
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  const left = habits.length - routinesProgress(habits, entries, now).count;
  const { status } = await post('/sync', {
    id,
    subscription: (await subscription()).toJSON(),
    hour: settings.hour,
    minute: settings.minute,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    status: { date: localDate(now), left },
  });
  if (status === 200) storage(SYNCED_KEY, '1');
}

export async function sendTestReminder(): Promise<string> {
  if (!remindersSupported) return reminderNote ?? '';
  if (Notification.permission !== 'granted') return 'Önce hatırlatıcıyı açıp bildirim izni ver.';
  try {
    const { status, data } = await post('/test', { id: deviceId() });
    if (status === 404) return 'Abonelik henüz sunucuda değil; birkaç saniye sonra tekrar dene.';
    return data.ok ? 'Test bildirimi gönderildi; birkaç saniye içinde gelir.' : `Bildirim gönderilemedi (${data.status ?? status}).`;
  } catch {
    return 'Bildirim sunucusuna ulaşılamadı. İnternet bağlantını kontrol et.';
  }
}
