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

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);

  const handleEmailLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing info', 'Please enter your email and password.');
      return;
    }
    setLoadingEmail(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoadingEmail(false);

    if (error) {
      Alert.alert('Login failed', error.message);
      return;
    }
    router.replace('/home');
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    try {
      provider === 'google' ? setLoadingGoogle(true) : setLoadingApple(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: 'yourapp://auth-callback', // adjust to your scheme
        },
      });
      provider === 'google' ? setLoadingGoogle(false) : setLoadingApple(false);
      if (error) {
        Alert.alert('Auth error', error.message);
      }
      // After OAuth completes & session is set, index.tsx will redirect to /home
    } catch (e: any) {
      provider === 'google' ? setLoadingGoogle(false) : setLoadingApple(false);
      Alert.alert('Auth error', e?.message ?? 'Something went wrong.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LogoHeader showBackButton/>
      <View style={styles.header}>

        <Text style={styles.headerTitle}>Log in</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        {/* Email & password */}
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

        <Text style={styles.dividerText}>or continue with</Text>

        {/* Google */}
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

        {/* Apple */}
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

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/SignupEmail')}>
            <Text style={styles.footerLink}> Sign up</Text>
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
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 18,
    marginTop: 16,
  },
  label: { fontSize: 13, color: TEXT_MUTED, marginBottom: 4 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2C3648',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: TEXT_PRIMARY,
    fontSize: 15,
  },
  primaryButton: {
    marginTop: 20,
    backgroundColor: PRIMARY,
    borderRadius: 999,
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryText: { color: '#020817', fontWeight: '600', fontSize: 15 },
  dividerText: {
    textAlign: 'center',
    color: TEXT_MUTED,
    marginVertical: 12,
    fontSize: 12,
  },
  oauthButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A465E',
    paddingVertical: 10,
    justifyContent: 'center',
    marginTop: 6,
  },
  oauthText: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '500' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: { color: TEXT_MUTED, fontSize: 13 },
  footerLink: { color: PRIMARY, fontSize: 13, fontWeight: '600' },
});
