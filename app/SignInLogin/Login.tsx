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

export default function Login() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const prefillEmail = Array.isArray(params.email) ? params.email[0] : params.email;

  const [email, setEmail] = useState(prefillEmail ?? '');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  const routingRef = useRef(false);

  const ensureProfileRow = async (userId: string) => {
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return { ok: false as const, message: 'You are not signed in. Please sign in again.' };
    }

    const metaUsername =
      (user.user_metadata as any)?.username?.trim?.() ||
      (user.user_metadata as any)?.Username?.trim?.();

    const fallbackUsername = `${(user.email?.split('@')[0] ?? 'user')}_${user.id.slice(0, 6)}`;

    const { error: ensureErr } = await supabase
      .schema('user')
      .from('profiles')
      .upsert(
        { auth_user_id: userId, username: metaUsername || fallbackUsername },
        { onConflict: 'auth_user_id' },
      );

    if (ensureErr) {
      return { ok: false as const, message: ensureErr.message };
    }

    return { ok: true as const };
  };

  const routeAfterLogin = async (userId: string) => {
    if (routingRef.current) return;
    routingRef.current = true;

    try {
      // Ensure profile exists (avoids NOT NULL username insert failures later)
      const ensure = await ensureProfileRow(userId);
      if (!ensure.ok) {
        Alert.alert('Error', ensure.message);
        routingRef.current = false;
        return;
      }

      // Fetch gating flags
      const { data, error } = await supabase
        .schema('user')
        .from('profiles')
        .select('onboarding_completed, has_accepted_privacy_policy')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (error) {
        Alert.alert('Error', error.message);
        routingRef.current = false;
        return;
      }

      const onboardingCompleted = data?.onboarding_completed === true;
      const hasAcceptedPrivacy = data?.has_accepted_privacy_policy === true;

      /**
       * ✅ Corrected order:
       * 1) If onboarding is NOT complete -> always start onboarding (UserInfo1).
       * 2) Only AFTER onboarding is complete do we enforce Terms/Privacy gate.
       * 3) Then go home.
       */

      if (!onboardingCompleted) {
        router.replace({
          pathname: '/SignInLogin/onboarding/UserInfo1',
          params: { authUserId: userId },
        });
        return;
      }

      if (!hasAcceptedPrivacy) {
        // Onboarding is done; now require terms acceptance before app access
        router.replace({
          pathname: '/SignInLogin/onboarding/TermsAndPrivacy',
          params: { nextPath: '/(tabs)/home' },
        });
        return;
      }

      router.replace('/(tabs)/home');
    } finally {
      // keep routingRef true to prevent double routing
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
