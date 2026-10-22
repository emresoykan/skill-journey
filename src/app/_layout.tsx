import { useEffect } from 'react';
import Constants from 'expo-constants';
import { Tabs } from 'expo-router';
import Head from 'expo-router/head';
import { Platform, Text } from 'react-native';
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

export default function Layout() {
  useEffect(prepareSounds, []);
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
      tabBarStyle: { backgroundColor: 'white', borderTopColor: '#E2E9E4' },
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
