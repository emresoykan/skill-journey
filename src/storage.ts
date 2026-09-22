import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Analysis } from './mockAnalysis';

export type Entry = Analysis & { id: string; createdAt: string; description: string };
const KEY = 'skill-journey:entries:v1';

export async function loadEntries(): Promise<Entry[]> {
  const stored = await AsyncStorage.getItem(KEY);
  if (!stored) return [];
  const parsed: unknown = JSON.parse(stored);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((entry): entry is Entry => !!entry && typeof entry === 'object' && typeof entry.id === 'string' && typeof entry.description === 'string' && typeof entry.skill === 'string' && typeof entry.xp === 'number' && typeof entry.createdAt === 'string');
}

export async function saveEntries(entries: Entry[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(entries));
}
