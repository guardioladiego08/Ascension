import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AuthScreen from './components/AuthScreen';
import AuthButton from './components/AuthButton';
import AuthField from './components/AuthField';
import {
  getAuthBootstrapDisplayName,
  getAuthBootstrapUsername,
} from '@/lib/auth/bootstrapIdentity';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useAuthDesignSystem } from './designSystem';

type Params = { email?: string };

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { colors, fonts } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const prefillEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  const [email, setEmail] = useState(prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  const routingRef = useRef(false);

  const ensureUserUsersRow = async (userId: string) => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { ok: false as const, message: 'You are not signed in. Please sign in again.' };
    }

    const username = getAuthBootstrapUsername(user, userId);

    const { data: existing, error: readErr } = await supabase
      .schema('user')
      .from('users')
      .select(
        'user_id,onboarding_completed,first_name,last_name,fitness_journey_stage,app_usage_reasons'
      )
      .eq('user_id', userId)
      .maybeSingle();

    if (readErr && (readErr as any).code !== 'PGRST116') {
      return { ok: false as const, message: readErr.message };
    }

    if (existing) {
      const hasName = Boolean(existing.first_name && existing.last_name);
      const hasJourney = Boolean(existing.fitness_journey_stage);
      const hasUsageReasons =
        Array.isArray(existing.app_usage_reasons) && existing.app_usage_reasons.length > 0;

      const inferredCompleted =
        existing.onboarding_completed === true || (hasName && hasJourney && hasUsageReasons);

      if (inferredCompleted && existing.onboarding_completed !== true) {
        const { error: repairErr } = await supabase
          .schema('user')
          .from('users')
          .update({ onboarding_completed: true })
          .eq('user_id', userId);

        if (repairErr) {
          return { ok: false as const, message: repairErr.message };
        }
      }

      return { ok: true as const, onboardingCompleted: inferredCompleted };
    }

    const { error: insertErr } = await supabase
      .schema('user')
      .from('users')
      .insert({
        user_id: userId,
        username,
        onboarding_completed: false,
        is_private: true,
        app_usage_reasons: [],
      });

    if (insertErr) {
      if ((insertErr as any).code !== '23505') {
        return { ok: false as const, message: insertErr.message };
      }
    }

    return { ok: true as const, onboardingCompleted: false };
  };

  const ensurePublicProfileRow = async (userId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const username = getAuthBootstrapUsername(user, userId);
    const displayName = getAuthBootstrapDisplayName(user, username);

    const { error } = await supabase
      .schema('public')
      .from('profiles')
      .upsert(
        {
          id: userId,
          username,
          display_name: displayName,
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.log('[ensurePublicProfileRow] non-fatal error', error);
    }
  };

  const ensureProfilesStubRow = async (userId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const username = getAuthBootstrapUsername(user, userId);

    const { error } = await supabase.from('profiles_stub').upsert(
      {
        user_id: userId,
        username,
      },
      { onConflict: 'user_id' }
    );

    if (error) {
      console.log('[ensureProfilesStubRow] non-fatal error', error);
    }
  };

  const routeAfterLogin = async (userId: string) => {
    if (routingRef.current) return;
    routingRef.current = true;

    try {
      const ensure = await ensureUserUsersRow(userId);
      if (!ensure.ok) {
        Alert.alert('Error', ensure.message);
        routingRef.current = false;
        return;
      }

      await Promise.all([ensureProfilesStubRow(userId), ensurePublicProfileRow(userId)]);

      const onboardingCompleted = ensure.onboardingCompleted === true;

      if (!onboardingCompleted) {
        router.replace('/SignInLogin/onboarding/UserInfo1');
        return;
      }

      router.replace('/(tabs)/home');
    } finally {
      // keep routingRef true to avoid double routing
    }
  };

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }

    setLoadingEmail(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoadingEmail(false);

    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      Alert.alert('Login failed', 'Could not read user session. Please try again.');
      return;
    }

    await routeAfterLogin(userId);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const id = session?.user?.id;
      if (id) {
        await routeAfterLogin(id);
      }
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthScreen
      eyebrow="Account access"
      title="Log in"
      subtitle="Pick up your training where you left off."
      showBackButton
      backTo="/SignInLogin/FirstPage"
      scrollable={false}
      bodyStyle={styles.body}
      backgroundImage={require('@/assets/images/login-gym-bg.png')}
    >
      <View style={styles.card}>
        <AuthField label="Email">
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </AuthField>

        <AuthField label="Password">
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </AuthField>

        <AuthButton
          label="Continue"
          onPress={handleEmailLogin}
          loading={loadingEmail}
        />

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don&apos;t have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/SignInLogin/SignupEmail')}>
            <Text style={styles.footerLink}> Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </AuthScreen>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts'],
  ui: ReturnType<typeof useAuthDesignSystem>
) {
  return StyleSheet.create({
    body: {
      justifyContent: 'center',
    },
    card: {
      ...ui.fragments.card,
      marginTop: -48,
    },
    input: {
      ...ui.fragments.input,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 4,
    },
    footerText: {
      ...ui.fragments.helperText,
    },
    footerLink: {
      ...ui.fragments.linkText,
    },
  });
}
