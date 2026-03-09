import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import AuthScreen from './components/AuthScreen';
import { withAlpha } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Params = { email?: string };

function sanitizeUsername(raw: string) {
  let u = (raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (u.length > 30) u = u.slice(0, 30);
  return u;
}

function buildFallbackUsername(email: string | null | undefined, userId: string) {
  const baseRaw = (email?.split('@')?.[0] ?? 'user') + '_' + userId.slice(0, 6);
  let u = sanitizeUsername(baseRaw);
  if (u.length < 3) u = `user_${userId.slice(0, 6)}`;
  if (u.length > 30) u = u.slice(0, 30);
  return u;
}

function getMetaUsername(user: any) {
  return (
    (user?.user_metadata as any)?.username?.trim?.() ||
    (user?.user_metadata as any)?.Username?.trim?.() ||
    ''
  );
}

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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

    const metaUsername = sanitizeUsername(getMetaUsername(user));
    const fallbackUsername = buildFallbackUsername(user.email, userId);
    const username = metaUsername.length >= 3 ? metaUsername : fallbackUsername;

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

  const ensureProfilesStubRow = async (userId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const metaUsername = sanitizeUsername(getMetaUsername(user));
    const fallbackUsername = buildFallbackUsername(user?.email, userId);
    const username = metaUsername.length >= 3 ? metaUsername : fallbackUsername;

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

      await ensureProfilesStubRow(userId);

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
      subtitle="Pick up your training, cardio, and nutrition history where you left off."
      showBackButton
      backTo="/SignInLogin/FirstPage"
      scrollable={false}
      bodyStyle={styles.body}
    >
      <View style={styles.card}>
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Enter your password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryButton, loadingEmail ? styles.buttonDisabled : null]}
          onPress={handleEmailLogin}
          disabled={loadingEmail}
          activeOpacity={0.92}
        >
          {loadingEmail ? (
            <ActivityIndicator color={colors.blkText} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue</Text>
          )}
        </TouchableOpacity>

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
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    body: {
      justifyContent: 'center',
    },
    card: {
      borderRadius: 28,
      padding: 22,
      gap: 18,
      backgroundColor: withAlpha(colors.surface, 0.92),
      borderWidth: 1,
      borderColor: colors.border,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    input: {
      minHeight: 54,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceRaised,
      paddingHorizontal: 16,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
    },
    primaryButton: {
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    buttonDisabled: {
      opacity: 0.72,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    footerLink: {
      color: colors.accent,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 18,
    },
  });
}
