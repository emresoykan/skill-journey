import { useSyncExternalStore } from 'react';

// Web'de sayfa derleme anında (statik HTML) bir kez çizilir; tarayıcıdaki ilk çizim bununla birebir aynı olmalıdır.
// Tarihe ve cihazdaki veriye bağlı içerik (bugünün günü, seri, kayıtlar) derleme anında bilinemez, bu yüzden
// yalnız tarayıcıda, ilk çizimden sonra gösterilir. Telefon uygulamasında hemen true'dur.
const subscribe = () => () => {};
export const useHydrated = () => useSyncExternalStore(subscribe, () => true, () => false);
