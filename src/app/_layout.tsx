import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { JourneyProvider } from '../journey-state';
import { LevelUpModal } from '../LevelUpModal';
import { tap } from '../feedback';
import { prepareSounds } from '../sounds';

export default function Layout() {
  useEffect(prepareSounds, []);
  return <JourneyProvider>
    <Tabs initialRouteName="index" screenListeners={{ tabPress: tap }} screenOptions={{
      headerStyle: { backgroundColor: '#F7F8F4' },
      headerTintColor: '#182637',
      headerShadowVisible: false,
      tabBarActiveTintColor: '#166B65',
      tabBarInactiveTintColor: '#657482',
      tabBarStyle: { backgroundColor: 'white', borderTopColor: '#E2E9E4' },
      tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
      tabBarHideOnKeyboard: true,
    }}>
      <Tabs.Screen name="index" options={{ title: 'Bugün', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>✦</Text> }} />
      <Tabs.Screen name="growth" options={{ title: 'Gelişim', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>↗</Text> }} />
      <Tabs.Screen name="memories" options={{ title: 'Anılar', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 23 }}>☷</Text> }} />
    </Tabs>
    <LevelUpModal />
  </JourneyProvider>;
}
