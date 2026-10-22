import { useEffect } from 'react';
import Constants from 'expo-constants';
import { Tabs } from 'expo-router';
import Head from 'expo-router/head';
import { Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { JourneyProvider } from '../journey-state';
import { LevelUpModal } from '../LevelUpModal';
import { tap } from '../feedback';
import { prepareSounds } from '../sounds';

// Home-screen icon for "Add to Home Screen" on iOS. On web the bundler turns the image into
// { uri } with the base URL applied, so it follows the GitHub Pages subpath;
// public/apple-touch-icon.png covers root-hosted builds.
const touchIcon = Platform.OS === 'web' ? (require('../../assets/apple-touch-icon.png') as { uri: string }).uri : undefined;
// Manifest (public/) "Ana Ekrana Ekle"yi tam ekran web uygulamasına çevirir; iPhone'da web push için gerekir.
const baseUrl = (Constants.expoConfig?.experiments as { baseUrl?: string } | undefined)?.baseUrl ?? '';
// Ana ekrandan açılan web uygulaması (iPhone'da Safari çubukları yok): sekme etiketleri ana ekran çizgisine yapışmasın.
const standalone = Platform.OS === 'web' && typeof window !== 'undefined'
  && (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true);

export default function Layout() {
  useEffect(prepareSounds, []);
  const insets = useSafeAreaInsets();
  // iOS bazen alt güvenli alanı 0 bildirir; en az 20 px boşluk bırakılır (çubuk 49 px + boşluk).
  const homeBar = standalone ? Math.max(insets.bottom, 20) : null;
  return <JourneyProvider>
    {Platform.OS === 'web' ? <Head>
      <title>Skill Journey</title>
      <meta name="apple-mobile-web-app-title" content="Skill Journey" />
      <link rel="apple-touch-icon" href={touchIcon} />
      <link rel="manifest" href={`${baseUrl}/manifest.webmanifest`} />
    </Head> : null}
    <Tabs initialRouteName="index" screenListeners={{ tabPress: tap }} screenOptions={{
      headerStyle: { backgroundColor: '#F7F8F4' },
      headerTintColor: '#182637',
      headerShadowVisible: false,
      tabBarActiveTintColor: '#166B65',
      tabBarInactiveTintColor: '#657482',
      tabBarStyle: { backgroundColor: 'white', borderTopColor: '#E2E9E4', ...(homeBar != null ? { height: 49 + homeBar, paddingBottom: homeBar } : null) },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      // Simge alanı 28 → 24 px: 49 px'lik çubukta 12 px kalın etikete yer kalsın (yoksa etiketin altı kesilir).
      tabBarIconStyle: { height: 24 },
      tabBarHideOnKeyboard: true,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>✦</Text> }} />
      <Tabs.Screen name="growth" options={{ title: 'Gelişim', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>↗</Text> }} />
      <Tabs.Screen name="memories" options={{ title: 'Anılar', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>☷</Text> }} />
    </Tabs>
    <LevelUpModal />
  </JourneyProvider>;
}
