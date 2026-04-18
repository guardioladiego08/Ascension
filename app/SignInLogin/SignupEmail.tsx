import React, { useCallback, useMemo, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';

import AuthScreen from './components/AuthScreen';
import AuthButton from './components/AuthButton';
import AuthField from './components/AuthField';
import AppAlert from './components/AppAlert';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useAuthDesignSystem } from './designSystem';

export default function SignupEmail() {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

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

  const handleEmailSignup = useCallback(async () => {
    Keyboard.dismiss();

    const emailTrim = email.trim();
    const passwordTrim = password.trim();

    if (!emailTrim || !passwordTrim) {
      showAlert('Missing info', 'Please enter email and password.');
      return;
    }

    setLoadingEmail(true);

    const { error } = await supabase.auth.signUp({
      email: emailTrim,
      password: passwordTrim,
    });

    setLoadingEmail(false);

    if (error) {
      console.log('[SignupEmail] sign up failed', {
        message: error.message,
        email: emailTrim,
      });

      showAlert('Sign up failed', error.message);
      return;
    }

    showAlert(
      'Check your email',
      'We sent you a confirmation link. After confirming your email, return and log in to continue onboarding.',
      () => {
        router.replace({ pathname: '/SignInLogin/Login', params: { email: emailTrim } });
      }
    );
  }, [email, password, router]);

  const handleOpenTerms = useCallback(() => {
    WebBrowser.openBrowserAsync('https://tensrfitness.com/terms-of-service/');
  }, []);

  return (
    <AuthScreen
      eyebrow="Create account"
      title="Start with email"
      subtitle="Set up your account first, then we’ll take you through the rest of onboarding."
      showBackButton
      backTo="/SignInLogin/FirstPage"
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
            placeholder="Create a password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </AuthField>

        <AuthButton
          label="Create account"
          onPress={handleEmailSignup}
          loading={loadingEmail}
        />

        <Text style={styles.termsNote}>
          By clicking Create account, you agree to our{' '}
          <Text style={styles.termsLink} onPress={handleOpenTerms}>
            Terms of Service
          </Text>
          .
        </Text>

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
    </AuthScreen>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts'],
  ui: ReturnType<typeof useAuthDesignSystem>
) {
  return StyleSheet.create({
    card: {
      ...ui.fragments.card,
    },
    input: {
      ...ui.fragments.input,
    },
    termsNote: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      textAlign: 'center',
      paddingHorizontal: 6,
      marginTop: -4,
    },
    termsLink: {
      color: ui.tones.accentStrong,
      fontFamily: fonts.heading,
    },
    footerRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },
    footerText: {
      ...ui.fragments.helperText,
    },
    footerLink: {
      ...ui.fragments.linkText,
    },
  });
}
