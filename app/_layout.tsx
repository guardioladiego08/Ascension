// app/_layout.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import MapboxGL from '@rnmapbox/maps';
import 'react-native-get-random-values';
import { UnitsProvider } from '@/contexts/UnitsContext';
import { SupabaseProvider } from '@/providers/SupabaseProvider';
import { ActiveRunWalkProvider } from '@/providers/ActiveRunWalkProvider';
import { AppThemeProvider } from '@/providers/AppThemeProvider';
import { FontAssets } from '@/constants/Fonts';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
  MapboxGL.setTelemetryEnabled(false);
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts(FontAssets);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <UnitsProvider>
      <AppThemeProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <SupabaseProvider>
                <ActiveRunWalkProvider>
                  <Stack screenOptions={{ headerShown: false }} />
                </ActiveRunWalkProvider>
                <StatusBar style="light" />
              </SupabaseProvider>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </AppThemeProvider>
    </UnitsProvider>
  );
}
