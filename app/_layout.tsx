// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';
import MapboxGL from '@rnmapbox/maps';
import 'react-native-get-random-values';
import { UnitsProvider } from '@/contexts/UnitsContext';


// ✅ Initialize Mapbox once with your public token
const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;

if (MAPBOX_TOKEN) {
  MapboxGL.setAccessToken(MAPBOX_TOKEN);
  MapboxGL.setTelemetryEnabled(false);
  console.log('🗺️ Mapbox initialized with token');
} else {
  console.warn('⚠️ No EXPO_PUBLIC_MAPBOX_TOKEN found in environment');
}

/**
 * 🔒 SessionRouterGuard
 * Redirects users to `/auth` if not logged in, or `/home` if logged in.
 */
function SessionRouterGuard() {
  const router = useRouter();
  const segments = useSegments();
  const navState = useRootNavigationState();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    // Get current Supabase session
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          console.error('[Auth] getSession error:', error.message);
          setError(error.message);
        }
        setSession(data?.session ?? null);
        setReady(true);
      })
      .catch((e) => {
        if (!active) return;
        console.error('[Auth] getSession threw:', e);
        setError((e as Error)?.message ?? 'getSession failed');
        setReady(true);
      });

    // Listen for auth changes
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!active) return;
      console.log('[Auth] onAuthStateChange:', event, Boolean(newSession));
      setSession(newSession ?? null);
    });

    return () => {
      active = false;
      listener.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!ready || !navState?.key) return;

    const inAuthRoute = segments[0] === 'auth';
    if (!session && !inAuthRoute) {
      router.replace('/auth');
    } else if (session && inAuthRoute) {
      router.replace('/home');
    }
  }, [ready, navState?.key, session, segments]);

  // Safety timeout: if not ready in 6s, allow navigation to auth
  useEffect(() => {
    if (ready) return;
    const t = setTimeout(() => {
      console.warn('[Auth] Router guard timeout — proceeding to auth');
      setReady(true);
    }, 6000);
    return () => clearTimeout(t);
  }, [ready]);

  return null;
}

/**
 * 🧱 Root Layout
 * Wraps app providers and initializes navigation and Mapbox.
 */
export default function RootLayout(): JSX.Element {
  return (
    <UnitsProvider>
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
    </UnitsProvider>
  );
}