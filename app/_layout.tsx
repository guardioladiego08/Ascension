// app/_layout.tsx
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import MapboxGL from '@rnmapbox/maps';
import 'react-native-get-random-values';
import { UnitsProvider } from '@/contexts/UnitsContext';
import { SupabaseProvider } from '@/providers/SupabaseProvider';
import { ActiveRunWalkProvider } from '@/providers/ActiveRunWalkProvider';

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
  MapboxGL.setTelemetryEnabled(false);
}

export default function RootLayout() {
  return (
    <UnitsProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
       <SafeAreaProvider>
         <BottomSheetModalProvider>
           <SupabaseProvider>
             <ActiveRunWalkProvider>
               <Stack screenOptions={{ headerShown: false }}>
                 <Stack.Screen name="(tabs)" />
                 <Stack.Screen name="SignInLogin" />
                 <Stack.Screen name="onboarding" />
                 <Stack.Screen name="auth" />
               </Stack>
             </ActiveRunWalkProvider>
             <StatusBar style="light" />
           </SupabaseProvider>
         </BottomSheetModalProvider>
       </SafeAreaProvider>
      </GestureHandlerRootView>
    </UnitsProvider>
  );
}
