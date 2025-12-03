// app/(tabs)/_layout.tsx
import React from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '@/components/my components/TabBar';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      // Use our custom tab bar
      tabBar={(props) => <CustomTabBar {...props} />}
    />
  );
}
