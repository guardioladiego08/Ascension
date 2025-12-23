import React, { useState } from 'react';
import {
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
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';


const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

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
    router.replace('/(tabs)/home');
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
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]} // darker -> lighter (adjust to taste)
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
    <View style={styles.container}>
      <LogoHeader showBackButton/>
      <View style={styles.header}>

        <Text style={styles.headerTitle}>Log In</Text>
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

        <View style={styles.footerRow}>
          <Text style={styles.footerText}>Don’t have an account?</Text>
          <TouchableOpacity onPress={() => router.replace('/SignupEmail')}>
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
    borderRadius: 15,
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
