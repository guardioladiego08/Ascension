// app/(tabs)/stats/_layout.tsx
// Nested Stack inside the "Stats" tab. This keeps the tab bar visible
// while you navigate between /stats, /stats/strength, etc.

import * as React from 'react';
import { Stack } from 'expo-router';

export default function StatsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* /(tabs)/stats/index.tsx */}
      <Stack.Screen name="index" />
      {/* Child pages this screen routes to */}
      <Stack.Screen name="strength" />
      <Stack.Screen name="cardio" />
      <Stack.Screen name="nutrition" />
      <Stack.Screen name="BodyComposition" />
      <Stack.Screen name="meals" />
    </Stack>
  );
}
