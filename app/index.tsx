// app/index.tsx
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useSupabaseSession } from '@/providers/SupabaseProvider';
import { supabase } from '@/lib/supabase';

type OnboardingState = 'unknown' | 'completed' | 'incomplete';

export default function Index() {
  const { session, loading } = useSupabaseSession();
  const [onboardingState, setOnboardingState] = useState<OnboardingState>('unknown');
  const [checkingProfile, setCheckingProfile] = useState(false);

  useEffect(() => {
    if (!session) {
      setOnboardingState('unknown');
      setCheckingProfile(false);
      return;
    }

    let cancelled = false;

    const checkProfile = async () => {
      setCheckingProfile(true);

      const { data, error } = await supabase
        .schema('public')
        .from('profiles')
        .select('onboarding_completed')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.log('profile check error', error);
        // Treat as not onboarded if we can't read it
        setOnboardingState('incomplete');
      } else {
        const completed = data?.onboarding_completed === true;
        setOnboardingState(completed ? 'completed' : 'incomplete');
      }

      setCheckingProfile(false);
    };

    checkProfile();

    return () => {
      cancelled = true;
    };
  }, [session]);

  // 1) Still loading session from SupabaseProvider
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // 2) No session -> go to FirstPage (login / sign up selector)
  if (!session) {
    return <Redirect href="/SignInLogin/FirstPage" />;
  }

  // 3) We have a session but are still checking the profile
  if (checkingProfile || onboardingState === 'unknown') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  // 4) Session + onboarding incomplete -> start at first onboarding screen
  if (onboardingState === 'incomplete') {
    return <Redirect href="/onboarding/UserInfo" />;
  }

  // 5) Session + onboarding complete -> go to home
  return <Redirect href="/(tabs)/home" />;
}
