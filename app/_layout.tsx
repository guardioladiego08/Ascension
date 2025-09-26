// app/_layout.tsx
// only change is in the guard: go to '/home' (not '/(tabs)')
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

// app/_layout.tsx
function SessionRouterGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session ?? null);
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!mounted) return;
      setSession(s ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !navState?.key) return;

    const inAuth = segments[0] === 'auth';

    if (!session && !inAuth) {
      // not logged in → push them to auth
      router.replace('/auth');
    }

    if (session && inAuth) {
      // logged in but still on auth → send to a safe default
      router.replace('/home'); // ✅ only when they’re on /auth
    }
  }, [ready, navState?.key, session, segments, router]);

  return null;
}

export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <BottomSheetModalProvider>
          <SessionRouterGuard />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="auth" />
          </Stack>
          <StatusBar style="light" />
        </BottomSheetModalProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
