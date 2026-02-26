// app/SignInLogin/Login.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

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
  const prefillEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  const [email, setEmail] = useState(prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  const routingRef = useRef(false);

  /**
   * Ensures a row exists in user.users for this auth user.
   * - Uses PK user_id
   * - Does NOT reference public.profiles
   */
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

    // Read existing profile first so we don't treat established users as "new".
    const { data: existing, error: readErr } = await supabase
      .schema('user')
      .from('users')
      .select('user_id,onboarding_completed,first_name,last_name,fitness_journey_stage,app_usage_reasons')
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

    // Insert only for true first-time users.
    const { error: insertErr } = await supabase
      .schema('user')
      .from('users')
      .insert({
        user_id: userId,
        username,
        onboarding_completed: false,
        is_private: true,
        app_usage_reasons: [], // matches your default type
      });

    if (insertErr) {
      // If this raced with another insert, continue as existing user.
      if ((insertErr as any).code !== '23505') {
        return { ok: false as const, message: insertErr.message };
      }
    }

    return { ok: true as const, onboardingCompleted: false };
  };

  /**
   * Optional: Ensure profiles_stub row exists (so your seed trigger can run off it).
   * Your table has: user_id (unique), username (nullable).
   */
  const ensureProfilesStubRow = async (userId: string) => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const metaUsername = sanitizeUsername(getMetaUsername(user));
    const fallbackUsername = buildFallbackUsername(user?.email, userId);
    const username = metaUsername.length >= 3 ? metaUsername : fallbackUsername;

    const { error } = await supabase
      .from('profiles_stub') // public schema by default
      .upsert(
        {
          user_id: userId,
          username,
        },
        { onConflict: 'user_id' }
      );

    // If RLS blocks this (common), don’t fail login—your auth.users trigger should seed this anyway.
    if (error) {
      console.log('[ensureProfilesStubRow] non-fatal error', error);
    }
  };

  const routeAfterLogin = async (userId: string) => {
    if (routingRef.current) return;
    routingRef.current = true;

    try {
      // 1) Ensure canonical rows exist
      const ensure = await ensureUserUsersRow(userId);
      if (!ensure.ok) {
        Alert.alert('Error', ensure.message);
        routingRef.current = false;
        return;
      }

      // Optional: seed stub (non-fatal if blocked)
      await ensureProfilesStubRow(userId);

      const onboardingCompleted = ensure.onboardingCompleted === true;

      // 3) Route
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

  // Handles OAuth completion or any auth state changes
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
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LogoHeader showBackButton />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Log In</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <Text style={[styles.label, { marginTop: 14 }]}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="••••••••"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loadingEmail && { opacity: 0.7 }]}
            onPress={handleEmailLogin}
            disabled={loadingEmail}
          >
            {loadingEmail ? (
              <ActivityIndicator color="#020817" />
            ) : (
              <Text style={styles.primaryText}>Log in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don’t have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/SignInLogin/SignupEmail')}>
              <Text style={styles.footerLink}> Sign up</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 32,
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  card: {
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
  },
  label: { fontSize: 13, color: TEXT_PRIMARY, marginBottom: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7b7b7bff',
    backgroundColor: '#b0b0b050',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: PRIMARY,
  },
  primaryText: { color: PRIMARY, fontWeight: '600', fontSize: 15 },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: { color: TEXT_MUTED, fontSize: 13 },
  footerLink: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
});
