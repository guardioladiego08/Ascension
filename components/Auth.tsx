// components/Auth.tsx
// After successful sign-in, navigate to '/home' (not '/(tabs)')
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';

const ORANGE = '#FF950A';
const BG = Colors?.dark?.background ?? '#121212';
const FG = '#e6e6e6';
const MUTED = '#9b9b9b';
const BORDER = '#2d2d2d';

const Spacer = ({ h = 12 }: { h?: number }) => <View style={{ height: h }} />;

const Auth: React.FC = () => {
  const router = useRouter();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ Supabase connection check on mount
  useEffect(() => {
    const testSupabaseConnection = async () => {
      console.log('🧩 ENV SUPABASE URL:', process.env.EXPO_PUBLIC_SUPABASE_URL);
      console.log('🧩 ENV SUPABASE KEY (first 15 chars):', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 15));

      if (!process.env.EXPO_PUBLIC_SUPABASE_URL) {
        console.log('❌ No Supabase URL found. Check your app.config.ts and .env');
        return;
      }

      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/auth/v1/health`);
        const text = await response.text();
        console.log('✅ SUPABASE HEALTH RESPONSE:', text);
      } catch (error) {
        console.log('❌ SUPABASE TEST FAILED:', error);
      }
    };

    testSupabaseConnection();
  }, []);

  // ✅ Handles login/signup
  const onSubmit = async () => {
    setMsg(null);
    setBusy(true);
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.replace('/home');
        setMsg('Signed in!');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMsg('Account created! Check your email (if confirmation is required).');
      }
    } catch (e: any) {
      setMsg(e?.message ?? 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Ascension</Text>
      <Text style={styles.subtitle}>
        {mode === 'signIn' ? 'Welcome back' : 'Create your account'}
      </Text>
      <Spacer h={24} />

      <View style={styles.field}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
          placeholderTextColor={MUTED}
          value={email}
          onChangeText={setEmail}
          style={styles.input}
        />
      </View>

      <Spacer h={12} />
      <View style={styles.field}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={MUTED}
          value={password}
          onChangeText={setPassword}
          style={styles.input}
        />
      </View>

      <Spacer h={20} />
      <TouchableOpacity style={styles.cta} onPress={onSubmit} disabled={busy}>
        {busy ? (
          <ActivityIndicator color="#1a1a1a" />
        ) : (
          <Text style={styles.ctaText}>{mode === 'signIn' ? 'Sign In' : 'Sign Up'}</Text>
        )}
      </TouchableOpacity>

      <Spacer h={14} />
      <TouchableOpacity
        onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')}
      >
        <Text style={styles.link}>
          {mode === 'signIn'
            ? "Don't have an account? Sign Up"
            : 'Have an account? Sign In'}
        </Text>
      </TouchableOpacity>

      {msg ? (
        <>
          <Spacer h={16} />
          <Text style={styles.msg}>{msg}</Text>
        </>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG, padding: 20, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: FG, textAlign: 'center' },
  subtitle: { fontSize: 16, color: MUTED, textAlign: 'center', marginTop: 6 },
  field: {},
  label: { color: FG, marginBottom: 6, fontSize: 14 },
  input: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: FG,
    backgroundColor: '#1a1a1a',
  },
  cta: {
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  ctaText: { color: '#1a1a1a', fontWeight: '700', fontSize: 16 },
  link: { color: FG, textAlign: 'center', textDecorationLine: 'underline' },
  msg: { color: FG, textAlign: 'center' },
});

export default Auth;
