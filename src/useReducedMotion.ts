import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Cihazda "Hareketi azalt" açıksa (iOS/Android ayarı, web'de prefers-reduced-motion) animasyonlar atlanır:
// değerler hemen son haline gelir, konfeti gösterilmez.
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}
