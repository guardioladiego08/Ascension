import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../components/AuthScreen';
import { withAlpha } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function Paywall() {
  const router = useRouter();
  const params = useLocalSearchParams<{ authUserId?: string }>();
  const authUserId = Array.isArray(params.authUserId)
    ? params.authUserId[0]
    : params.authUserId;
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [finishing, setFinishing] = useState(false);

  const finishOnboarding = async () => {
    if (!authUserId) {
      const { data: authData, error: userError } = await supabase.auth.getUser();
      if (userError || !authData.user) {
        Alert.alert('Error', 'Could not find your account. Please log in again.');
        return;
      }

      const fallbackId = authData.user.id;

      await supabase
        .schema('user')
        .from('users')
        .update({ onboarding_completed: true })
        .eq('user_id', fallbackId);

      router.replace('/SignInLogin/Login');
      return;
    }

    setFinishing(true);

    const { error } = await supabase
      .schema('user')
      .from('users')
      .update({ onboarding_completed: true })
      .eq('user_id', authUserId);

    setFinishing(false);

    if (error) {
      console.log('finish onboarding error', error);
      Alert.alert('Error', error.message);
      return;
    }

    router.replace('/SignInLogin/Login');
  };

  const handleSkip = async () => {
    await finishOnboarding();
  };

  const handleSubscribe = async () => {
    await finishOnboarding();
  };

  return (
    <AuthScreen
      eyebrow="Step 5 of 5"
      title="Unlock Tensr Premium"
      subtitle="Keep the same dark workflow, with deeper analytics, longer history, and premium progression tools."
      headerRight={
        <TouchableOpacity onPress={handleSkip} disabled={finishing} activeOpacity={0.92}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      }
      bodyStyle={styles.body}
    >
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconWrap}>
            <Ionicons name="star-outline" size={24} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Premium gives your training more context.</Text>
        </View>

        <Text style={styles.bodyText}>
          Get advanced strength analytics, cleaner cardio breakdowns, and more complete history
          across the same workflows you already use.
        </Text>

        <View style={styles.featureList}>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.featureText}>Unlimited workout and run history</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.featureText}>Advanced performance charts</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.featureText}>Social leaderboards and badges</Text>
          </View>
          <View style={styles.featureRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
            <Text style={styles.featureText}>Priority access to new features</Text>
          </View>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.primaryButton, finishing ? styles.buttonDisabled : null]}
          onPress={handleSubscribe}
          disabled={finishing}
          activeOpacity={0.92}
        >
          {finishing ? (
            <ActivityIndicator color={colors.blkText} />
          ) : (
            <Text style={styles.primaryButtonText}>Continue with Premium</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryButton, finishing ? styles.buttonDisabled : null]}
          onPress={handleSkip}
          disabled={finishing}
          activeOpacity={0.92}
        >
          <Text style={styles.secondaryButtonText}>Continue with free plan</Text>
        </TouchableOpacity>
      </View>
    </AuthScreen>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    body: {
      justifyContent: 'center',
    },
    skipText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    card: {
      borderRadius: 28,
      padding: 22,
      gap: 16,
      backgroundColor: withAlpha(colors.surface, 0.92),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardHeader: {
      gap: 14,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 26,
      lineHeight: 30,
      letterSpacing: -0.8,
    },
    bodyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
    },
    featureList: {
      gap: 12,
      marginTop: 4,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    featureText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      gap: 12,
      marginTop: 18,
    },
    primaryButton: {
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    secondaryButton: {
      height: 54,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    secondaryButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
  });
}
