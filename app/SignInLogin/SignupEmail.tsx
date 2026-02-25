// app/SignInLogin/SignupEmail.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from './components/AppAlert';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

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

/**
 * Checks username availability against user.users.username.
 *
 * IMPORTANT requirements:
 * 1) Supabase Dashboard → Project Settings → API → Schemas
 *    - Make sure "user" schema is exposed.
 *
 * 2) RLS:
 *    - If RLS is ON for user.users and you don't have a SELECT policy that allows this check,
 *      the query may fail (42501) or always return null.
 *    - Best practice: create a public view (e.g. public.username_registry) OR an RPC
 *      (SECURITY DEFINER) that only checks existence.
 */
async function checkUsernameAgainstUserUsers(desired: string) {
  // Query schema('user') table('users') column username
  const { data, error } = await supabase
    .schema('public')
    .from('profiles_stub')
    .select('user_id')
    .eq('username', desired)
    .limit(1)
    .maybeSingle();

  return { exists: !!data, error };
}

export default function SignupEmail() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');

  const [loadingEmail, setLoadingEmail] = useState(false);

  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

  // 🔔 Custom alert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnConfirm(() => (onConfirm ? onConfirm : null));
    setAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    if (alertOnConfirm) {
      const cb = alertOnConfirm;
      setAlertOnConfirm(null);
      cb();
    }
  };

  const usernameSanitized = useMemo(() => sanitizeUsername(usernameInput), [usernameInput]);

  const checkUsernameAvailability = useCallback(async () => {
    Keyboard.dismiss();

    const desired = usernameSanitized;
    if (!desired) return;

    if (desired.length < 3) {
      setUsernameAvailable(false);
      showAlert('Invalid username', 'Username must be at least 3 characters.');
      return;
    }

    setCheckingUsername(true);
    setUsernameAvailable(null);

    // 1) If you have an RPC, use it (preferred).
    // Update your RPC to check "user".users (NOT public.profiles).
    // If RPC doesn't exist, this will error and we fall back to direct query.
    const { data: rpcData, error: rpcErr } = await supabase.rpc('is_username_available', {
      desired_username: desired,
    });

    if (!rpcErr) {
      setCheckingUsername(false);
      setUsernameAvailable(rpcData === true);
      return;
    }

    // 2) Fallback: direct query against user.users
    const { exists, error: qErr } = await checkUsernameAgainstUserUsers(desired);

    setCheckingUsername(false);

    if (qErr) {
      console.log('username check error', qErr);

      // Common failure: RLS blocks select (42501) or schema not exposed
      const code = (qErr as any)?.code;
      if (code === '42501') {
        showAlert(
          'Username check blocked',
          'Your database RLS is preventing username checks. Create a public view (recommended) or an RPC (SECURITY DEFINER) that only checks username existence.'
        );
        return;
      }

      if (code === 'PGRST200' || code === 'PGRST205') {
        showAlert(
          'Schema/table not exposed',
          'Make sure the "user" schema is exposed in Supabase API settings (Project Settings → API → Schemas).'
        );
        return;
      }

      showAlert('Error', 'Could not check username right now.');
      return;
    }

    setUsernameAvailable(!exists);
  }, [usernameSanitized]);

  const handleEmailSignup = useCallback(async () => {
    Keyboard.dismiss();

    const emailTrim = email.trim();
    const passwordTrim = password.trim();
    const usernameTrim = usernameSanitized;

    if (!emailTrim || !passwordTrim || !usernameTrim) {
      showAlert('Missing info', 'Please enter email, username, and password.');
      return;
    }

    if (usernameTrim.length < 3) {
      showAlert('Invalid username', 'Username must be at least 3 characters.');
      return;
    }

    // If they never pressed "Check", do it here to prevent duplicates
    if (usernameAvailable === null) {
      setCheckingUsername(true);
      try {
        const { exists, error: qErr } = await checkUsernameAgainstUserUsers(usernameTrim);

        if (qErr) {
          console.log('username check error (during signup)', qErr);
          showAlert(
            'Could not verify username',
            'Please press "Check" to verify your username, or ensure username checking is enabled server-side.'
          );
          return;
        }

        if (exists) {
          setUsernameAvailable(false);
          showAlert('Username taken', 'Please choose a different username.');
          return;
        }

        setUsernameAvailable(true);
      } finally {
        setCheckingUsername(false);
      }
    }

    if (usernameAvailable === false) {
      showAlert('Username taken', 'Please choose a different username.');
      return;
    }

    setLoadingEmail(true);

    const { data, error } = await supabase.auth.signUp({
      email: emailTrim,
      password: passwordTrim,
      options: {
        // This metadata is optional; you can use it later after login to prefill onboarding.
        data: {
          username: usernameTrim,
          display_name: usernameTrim,
        },
      },
    });

    setLoadingEmail(false);

    if (error) {
      showAlert('Sign up failed', error.message);
      return;
    }

    // IMPORTANT CHANGE:
    // We do NOT upsert into public.profiles anymore.
    // Your canonical table is "user".users and you said you want to submit onboarding ONLY at the end.
    // After they confirm email and log in, your onboarding flow will upsert user.users in one shot.

    const userId = data.user?.id;
    if (!userId) {
      showAlert('Error', 'Account was created, but we did not receive an ID. Please try again.');
      return;
    }

    showAlert(
      'Check your email',
      'We sent you a confirmation link. After confirming your email, return and log in to continue onboarding.',
      () => {
        router.replace({ pathname: '/SignInLogin/Login', params: { email: emailTrim } });
      }
    );
  }, [email, password, usernameSanitized, usernameAvailable, router]);

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
          <Text style={styles.headerTitle}>Create an account</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            value={email}
            onChangeText={(v) => setEmail(v)}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <Text style={styles.label}>Username</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={usernameInput}
              onChangeText={(v) => {
                setUsernameInput(v);
                setUsernameAvailable(null);
              }}
              autoCapitalize="none"
              placeholder="my_username"
              placeholderTextColor={TEXT_MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TouchableOpacity
              style={styles.smallButton}
              onPress={checkUsernameAvailability}
              disabled={checkingUsername || !usernameInput.trim()}
            >
              {checkingUsername ? (
                <ActivityIndicator color="#020817" />
              ) : (
                <Text style={styles.smallButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>

          {!!usernameInput.trim() && usernameSanitized !== usernameInput.trim().toLowerCase() && (
            <Text style={styles.helperText}>
              Will be saved as: <Text style={{ fontWeight: '700' }}>{usernameSanitized}</Text>
            </Text>
          )}

          {usernameAvailable === true && (
            <Text style={[styles.helperText, { color: '#15C779' }]}>Username is available.</Text>
          )}
          {usernameAvailable === false && (
            <Text style={[styles.helperText, { color: '#FF6B81' }]}>Username is already taken.</Text>
          )}

          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={(v) => setPassword(v)}
            secureTextEntry
            placeholder="Create a password"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              (loadingEmail || checkingUsername) && { opacity: 0.7 },
            ]}
            onPress={handleEmailSignup}
            disabled={loadingEmail || checkingUsername}
          >
            {loadingEmail ? (
              <ActivityIndicator color="#020817" />
            ) : (
              <Text style={styles.primaryText}>Create account</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <TouchableOpacity onPress={() => router.replace('/SignInLogin/Login')}>
              <Text style={styles.footerLink}> Log in</Text>
            </TouchableOpacity>
          </View>
        </View>

        <AppAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={handleCloseAlert}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 24,
    color: TEXT_PRIMARY,
    fontWeight: '600',
  },
  card: { borderRadius: 18, padding: 18, marginTop: 16 },
  label: { fontSize: 13, color: TEXT_PRIMARY, marginTop: 10, marginBottom: 4 },
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
  smallButton: {
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  smallButtonText: { color: PRIMARY, fontWeight: '600', fontSize: 13 },
  helperText: { fontSize: 12, color: TEXT_MUTED, marginTop: 6 },
  primaryButton: {
    marginTop: 16,
    borderWidth: 1.5,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: PRIMARY, fontWeight: '600', fontSize: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: TEXT_MUTED, fontSize: 13 },
  footerLink: { color: Colors.dark.highlight1, fontSize: 13, fontWeight: '600' },
});