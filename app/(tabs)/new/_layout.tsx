// app/(tabs)/new/_layout.tsx
// Nested Stack inside the "New" tab. Navigating to 'strength' (relative) keeps the tab bar visible.

import * as React from 'react';
import { Stack } from 'expo-router';

export default function NewTabStack() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* /(tabs)/new/index.tsx */}
      <Stack.Screen name="index" />
      {/* /(tabs)/new/strength.tsx (exact file name) */}
      <Stack.Screen name="strength" />
    </Stack>
  );
}
