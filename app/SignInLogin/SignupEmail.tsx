import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import AppAlert from './components/AppAlert';
import { withAlpha } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';

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

async function checkUsernameAgainstUserUsers(desired: string) {
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
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [email, setEmail] = useState('');
  const [usernameInput, setUsernameInput] = useState('');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);

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

    const { data: rpcData, error: rpcErr } = await supabase.rpc('is_username_available', {
      desired_username: desired,
    });

    if (!rpcErr) {
      setCheckingUsername(false);
      setUsernameAvailable(rpcData === true);
      return;
    }

    const { exists, error: qErr } = await checkUsernameAgainstUserUsers(desired);
    setCheckingUsername(false);

    if (qErr) {
      console.log('username check error', qErr);
      const code = (qErr as any)?.code;
      if (code === '42501') {
        showAlert(
          'Username check blocked',
          'Your database RLS is preventing username checks. Create a public view or a SECURITY DEFINER RPC for username availability.'
        );
        return;
      }

      if (code === 'PGRST200' || code === 'PGRST205') {
        showAlert(
          'Schema/table not exposed',
          'Make sure the required schema and username lookup table are exposed in Supabase API settings.'
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

    if (usernameAvailable === null) {
      setCheckingUsername(true);
      try {
        const { exists, error: qErr } = await checkUsernameAgainstUserUsers(usernameTrim);

        if (qErr) {
          console.log('username check error (during signup)', qErr);
          showAlert(
            'Could not verify username',
            'Please verify the username before creating the account.'
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

    const userId = data.user?.id;
    if (!userId) {
      showAlert(
        'Error',
        'Account was created, but we did not receive an ID. Please try again.'
      );
      return;
    }

    showAlert(
      'Check your email',
      'We sent you a confirmation link. After confirming your email, return and log in to continue onboarding.',
      () => {
        router.replace({ pathname: '/SignInLogin/Login', params: { email: emailTrim } });
      }
    );
  }, [email, password, usernameAvailable, usernameSanitized, router]);

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
          <Text style={styles.label}>Username</Text>
          <View style={styles.usernameRow}>
            <TextInput
              value={usernameInput}
              onChangeText={(value) => {
                setUsernameInput(value);
                setUsernameAvailable(null);
              }}
              autoCapitalize="none"
              placeholder="my_username"
              placeholderTextColor={colors.textMuted}
              style={[styles.input, styles.usernameInput]}
            />

            <TouchableOpacity
              style={[
                styles.inlineButton,
                (checkingUsername || !usernameInput.trim()) && styles.inlineButtonDisabled,
              ]}
              onPress={checkUsernameAvailability}
              disabled={checkingUsername || !usernameInput.trim()}
              activeOpacity={0.92}
            >
              {checkingUsername ? (
                <ActivityIndicator color={colors.blkText} />
              ) : (
                <Text style={styles.inlineButtonText}>Check</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {!!usernameInput.trim() && usernameSanitized !== usernameInput.trim().toLowerCase() ? (
          <Text style={styles.helperText}>
            Saved as <Text style={styles.helperValue}>{usernameSanitized}</Text>
          </Text>
        ) : null}

        {usernameAvailable === true ? (
          <Text style={[styles.helperText, styles.helperSuccess]}>Username is available.</Text>
        ) : null}
        {usernameAvailable === false ? (
          <Text style={[styles.helperText, styles.helperDanger]}>
            Username is already taken.
          </Text>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Create a password"
            placeholderTextColor={colors.textMuted}
            style={styles.input}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            (loadingEmail || checkingUsername) && styles.buttonDisabled,
          ]}
          onPress={handleEmailSignup}
          disabled={loadingEmail || checkingUsername}
          activeOpacity={0.92}
        >
          {loadingEmail ? (
            <ActivityIndicator color={colors.blkText} />
          ) : (
            <Text style={styles.primaryButtonText}>Create account</Text>
          )}
        </TouchableOpacity>

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
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      borderRadius: 28,
      padding: 22,
      gap: 16,
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
    usernameRow: {
      flexDirection: 'row',
      gap: 10,
      alignItems: 'center',
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
    usernameInput: {
      flex: 1,
    },
    inlineButton: {
      minWidth: 96,
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      paddingHorizontal: 16,
    },
    inlineButtonDisabled: {
      opacity: 0.62,
    },
    inlineButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    helperText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    helperValue: {
      color: colors.text,
      fontFamily: fonts.heading,
    },
    helperSuccess: {
      color: colors.success,
    },
    helperDanger: {
      color: colors.danger,
    },
    primaryButton: {
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 4,
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
      color: colors.accent,
      fontFamily: fonts.heading,
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
