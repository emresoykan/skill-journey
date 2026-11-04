import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Web sürümünü kurulabilir ve internetsiz açılır yapan service worker'ı (public/sw.js) kaydeder.
// Geliştirmede kaydedilmez: değişen geliştirme paketleri önbelleğe takılmasın.
const BASE = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';

export function registerServiceWorker() {
  if (Platform.OS !== 'web' || __DEV__ || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(error => console.warn('[pwa] service worker kaydedilemedi', error));
  // Ana ekrana eklenmiş uygulamada tarayıcıdan kalıcı depolama istenir: yer darlığında kayıtlar silinmesin.
  // Bazı tarayıcılar sekmede izin penceresi açtığı için yalnız kurulu uygulamada istenir.
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true;
  if (standalone) navigator.storage?.persist?.().catch(() => {});
}
