// app/auth.tsx
// Authentication screen entry point for the app.
// Wraps the <Auth /> component inside a safe, styled container.

import React from 'react';
import { SafeAreaView, StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import Auth from '@/components/Auth';
import { Colors } from '@/constants/Colors';

export default function AuthRoute(): JSX.Element {
  const BG = Colors?.dark?.background ?? '#121212';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: BG }]}>
      {/* Status bar styling */}
      <StatusBar barStyle="light-content" backgroundColor={BG} />

      {/* Main auth container */}
      <View style={styles.container}>
        <React.Suspense fallback={<ActivityIndicator size="large" color="#FF950A" />}>
          <Auth />
        </React.Suspense>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
});
