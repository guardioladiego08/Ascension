import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={{ flex: 1, backgroundColor: '#2f2f2f' }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Slot />
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
