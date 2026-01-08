import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'tensr.outdoor.activeSessionId';

export async function setActiveOutdoorSessionId(id: string) {
  await AsyncStorage.setItem(KEY, id);
}

export async function getActiveOutdoorSessionId(): Promise<string | null> {
  return AsyncStorage.getItem(KEY);
}

export async function clearActiveOutdoorSessionId() {
  await AsyncStorage.removeItem(KEY);
}
