// app/_layout.tsx
// ✅ Your root layout is good. Here it is with the root Stack and providers.
// The (tabs) group renders inside this Stack, so the tab bar remains visible
// for any screens routed under `(tabs)`.

import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Your entire tab navigator lives under this group */}
            <Stack.Screen name="(tabs)" />
            {/*
              Add any global flows outside the tab bar here, e.g.:
              <Stack.Screen name="(modals)" options={{ presentation: 'modal' }} />
              <Stack.Screen name="login" />
            */}
          </Stack>
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
