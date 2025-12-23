// app/SignInLogin/SignupEmail.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from './components/AppAlert';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

export default function SignupEmail() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

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

  const checkUsernameAvailability = async () => {
    if (!username.trim()) return;
    setCheckingUsername(true);
    setUsernameAvailable(null);

    const { data, error } = await supabase.rpc('is_username_available', {
      desired_username: username.trim(),
    });

    setCheckingUsername(false);

    if (error) {
      console.log('username rpc error', error);
      showAlert('Error', 'Could not check username right now.');
      return;
    }

    setUsernameAvailable(data === true);
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      showAlert('Missing info', 'Please enter email, username, and password.');
      return;
    }

    if (usernameAvailable === false) {
      showAlert('Username taken', 'Please choose a different username.');
      return;
    }

    setLoadingEmail(true);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
      options: {
        data: {
          username: username.trim(),
        },
      },
    });

    if (error) {
      setLoadingEmail(false);
      showAlert('Sign up failed', error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoadingEmail(false);
      showAlert(
        'Error',
        'Account was created, but we did not receive an ID. Please try again.',
      );
      return;
    }

    const { error: profileError } = await supabase
      .schema('user')
      .from('profiles')
      .upsert(
        {
          auth_user_id: userId,
          username: username.trim(),
        },
        { onConflict: 'auth_user_id' },
      );

    setLoadingEmail(false);

    if (profileError) {
      console.log('profile upsert error', profileError);
      showAlert(
        'Error',
        'Your account was created, but we could not save your profile. Please try again.',
      );
      return;
    }

    // ✅ Show custom popup and then navigate after user closes it
    showAlert(
      'Check your email',
      'We sent you a confirmation link. You can continue onboarding now and confirm your email after finishing.',
      () => {
        router.replace({
          pathname: './onboarding/UserInfo',
          params: { authUserId: userId },
        });
      },
    );
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      provider === 'google' ? setLoadingGoogle(true) : setLoadingApple(true);

      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'yourapp://auth-callback',
        },
      });

      provider === 'google' ? setLoadingGoogle(false) : setLoadingApple(false);

      if (error) {
        showAlert('Auth error', error.message);
      }
    } catch (e: any) {
      provider === 'google' ? setLoadingGoogle(false) : setLoadingApple(false);
      showAlert('Auth error', e?.message ?? 'Something went wrong.');
    }
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]} // darker -> lighter (adjust to taste)
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
          {/* Email */}
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

          {/* Username + check */}
          <Text style={styles.label}>Username</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              value={username}
              onChangeText={(v) => {
                setUsername(v);
                setUsernameAvailable(null);
              }}
              autoCapitalize="none"
              placeholder="diego_lifts"
              placeholderTextColor={TEXT_MUTED}
              style={[styles.input, { flex: 1 }]}
            />
            <TouchableOpacity
              style={styles.smallButton}
              onPress={checkUsernameAvailability}
              disabled={checkingUsername || !username.trim()}
            >
              {checkingUsername ? (
                <ActivityIndicator color="#020817" />
              ) : (
                <Text style={styles.smallButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>
          {usernameAvailable === true && (
            <Text style={[styles.helperText, { color: '#15C779' }]}>
              Username is available.
            </Text>
          )}
          {usernameAvailable === false && (
            <Text style={[styles.helperText, { color: '#FF6B81' }]}>
              Username is already taken.
            </Text>
          )}

          {/* Password */}
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a password"
            placeholderTextColor={TEXT_MUTED}
            style={styles.input}
          />

          <TouchableOpacity
            style={[styles.primaryButton, loadingEmail && { opacity: 0.7 }]}
            onPress={handleEmailSignup}
            disabled={loadingEmail}
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

        {/* 🔔 Global popup for this screen */}
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
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#010408ff',
    paddingVertical: 10,
    justifyContent: 'center',
    marginBottom: 8,
  },
  oauthText: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '500' },
  dividerText: {
    textAlign: 'center',
    color: TEXT_MUTED,
    marginVertical: 12,
    fontSize: 12,
  },
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
  helperText: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
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
