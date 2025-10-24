// components/my components/cardio/OutdoorMap.tsx
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

/**
 * 🚀 OutdoorMap (Blank Page)
 * Temporary placeholder screen that can redirect or render content later.
 */
export default function OutdoorMap() {
  const router = useRouter();

  useEffect(() => {
    // Example redirect after short delay — adjust or remove as needed
    const timer = setTimeout(() => {
      // Replace with your actual destination route
      router.replace('/(tabs)/stats/cardio');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return <View style={styles.blankContainer} />;
}

const styles = StyleSheet.create({
  blankContainer: {
    flex: 1,
    backgroundColor: '#121212', // consistent with Tensr dark theme
  },
});
