// app/SignInLogin/SignupEmail.tsx
import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.tint;
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

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
      Alert.alert('Error', 'Could not check username right now.');
      return;
    }

    setUsernameAvailable(data === true);
  };

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim() || !username.trim()) {
      Alert.alert('Missing info', 'Please enter email, username, and password.');
      return;
    }

    if (usernameAvailable === false) {
      Alert.alert('Username taken', 'Please choose a different username.');
      return;
    }

    setLoadingEmail(true);

    // 1) Sign up with email/password. With email confirmation ON this will NOT create a session,
    // but it DOES return data.user with the new auth user id.
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
      Alert.alert('Sign up failed', error.message);
      return;
    }

    const userId = data.user?.id;
    if (!userId) {
      setLoadingEmail(false);
      Alert.alert(
        'Error',
        'Account was created, but we did not receive an ID. Please try again.',
      );
      return;
    }

    // 2) Create profile row with username. This uses anon role, so RLS must allow anon (dev_all_profiles_access).
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
      Alert.alert(
        'Error',
        'Your account was created, but we could not save your profile. Please try again.',
      );
      return;
    }

    // Optional: tell them to check email for confirmation
    Alert.alert(
      'Check your email',
      'We sent you a confirmation link. You can continue onboarding now and confirm your email whenever you like.',
    );

    // 3) Go to onboarding step 1, passing authUserId as a route param
    router.replace({
      pathname: './onboarding/UserInfo',
      params: { authUserId: userId },
    });
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
        Alert.alert('Auth error', error.message);
      }
    } catch (e: any) {
      provider === 'google' ? setLoadingGoogle(false) : setLoadingApple(false);
      Alert.alert('Auth error', e?.message ?? 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader showBackButton />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Create an account</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        {/* OAuth buttons */}
        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth('google')}
          disabled={loadingGoogle}
        >
          {loadingGoogle ? (
            <ActivityIndicator color={TEXT_PRIMARY} />
          ) : (
            <>
              <Ionicons name="logo-google" size={18} color={TEXT_PRIMARY} />
              <Text style={styles.oauthText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.oauthButton}
          onPress={() => handleOAuth('apple')}
          disabled={loadingApple}
        >
          {loadingApple ? (
            <ActivityIndicator color={TEXT_PRIMARY} />
          ) : (
            <>
              <Ionicons name="logo-apple" size={18} color={TEXT_PRIMARY} />
              <Text style={styles.oauthText}>Continue with Apple</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.dividerText}>or sign up with email</Text>

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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG, paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, color: TEXT_PRIMARY, fontWeight: '600' },
  card: { backgroundColor: CARD, borderRadius: 18, padding: 18, marginTop: 16 },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A465E',
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
  label: { fontSize: 13, color: TEXT_MUTED, marginTop: 10, marginBottom: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C3648',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
  },
  smallButton: {
    borderRadius: 999,
    backgroundColor: PRIMARY,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  smallButtonText: { color: '#020817', fontWeight: '600', fontSize: 13 },
  helperText: { fontSize: 12, color: TEXT_MUTED, marginTop: 4 },
  primaryButton: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  footerText: { color: TEXT_MUTED, fontSize: 13 },
  footerLink: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
});
