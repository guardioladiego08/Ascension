import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../components/AuthScreen';
import AuthButton from '../components/AuthButton';
import AppAlert from '../components/AppAlert';
import { supabase } from '@/lib/supabase';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useAuthDesignSystem } from '../designSystem';

type Params = {
  nextPath?: string;
};

const PRIVACY_POLICY_TEXT = `
Privacy Policy (placeholder)

Replace this with your real privacy policy content.
Include:
- What data you collect (profile, workouts, location for runs, etc.)
- How you use it (analytics, personalization)
- Data sharing (processors like Supabase, Mapbox)
- Data retention & deletion
- User rights
- Contact info
`;

const TERMS_TEXT = `
Terms & Conditions (placeholder)

Replace this with your real terms.
Include:
- Acceptable use
- Disclaimers (not medical advice)
- Subscription/payment terms (if applicable)
- Liability limitations
- Termination
- Governing law
`;

function isScrolledToBottom(
  event: NativeSyntheticEvent<NativeScrollEvent>,
  thresholdPx = 24
) {
  const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - thresholdPx;
}

function sanitizeUsername(raw: string) {
  let value = (raw ?? '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  if (value.length > 30) value = value.slice(0, 30);
  return value;
}

function buildFallbackUsername(email: string | null | undefined, userId: string) {
  const baseRaw = (email?.split('@')?.[0] ?? 'user') + '_' + userId.slice(0, 6);
  let value = sanitizeUsername(baseRaw);
  if (value.length < 3) value = `user_${userId.slice(0, 6)}`;
  if (value.length > 30) value = value.slice(0, 30);
  return value;
}

export default function TermsAndPrivacy() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { colors, fonts } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const nextPath = Array.isArray(params.nextPath) ? params.nextPath[0] : params.nextPath;

  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy');
  const [accepted, setAccepted] = useState(false);
  const [loadingState, setLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);
  const [termsReadToEnd, setTermsReadToEnd] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleCloseAlert = () => setAlertVisible(false);

  useEffect(() => {
    const load = async () => {
      setLoadingState(true);
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          showAlert('Auth error', 'You are not signed in. Please sign in again.');
          return;
        }

        const metaUsername =
          (user.user_metadata as any)?.username?.trim?.() ||
          (user.user_metadata as any)?.Username?.trim?.() ||
          '';

        const username = (() => {
          const sanitized = sanitizeUsername(metaUsername);
          if (sanitized.length >= 3) return sanitized;
          return buildFallbackUsername(user.email, user.id);
        })();

        const metaDisplayName =
          (user.user_metadata as any)?.display_name?.trim?.() ||
          (user.user_metadata as any)?.displayName?.trim?.() ||
          '';

        const displayName = (metaDisplayName || username).trim();

        const { error: ensureError } = await supabase
          .schema('public')
          .from('profiles')
          .upsert({ id: user.id, username, display_name: displayName }, { onConflict: 'id' });

        if (ensureError) {
          showAlert('Error', ensureError.message);
          return;
        }

        const { data, error } = await supabase
          .schema('public')
          .from('profiles')
          .select('has_accepted_privacy_policy')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          showAlert('Error', error.message);
          return;
        }

        const alreadyAccepted = data?.has_accepted_privacy_policy === true;
        setAccepted(alreadyAccepted);

        if (alreadyAccepted) {
          setTermsReadToEnd(true);
        }
      } finally {
        setLoadingState(false);
      }
    };

    load();
  }, []);

  const canToggleAgree = useMemo(() => {
    if (accepted) return false;
    return termsReadToEnd;
  }, [accepted, termsReadToEnd]);

  const canContinue = useMemo(() => accepted === true, [accepted]);

  const handleAcceptPress = () => {
    if (accepted) return;

    if (!termsReadToEnd) {
      showAlert('Read terms', 'Please scroll to the bottom of the Terms before you can agree.');
      setTab('terms');
      return;
    }

    setAccepted(true);
  };

  const handleSaveAndContinue = async () => {
    if (!accepted) return;

    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        showAlert('Auth error', 'You are not signed in. Please sign in again.');
        return;
      }

      const { error } = await supabase
        .schema('public')
        .from('profiles')
        .update({
          has_accepted_privacy_policy: true,
          privacy_accepted_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) {
        showAlert('Error', error.message);
        return;
      }

      router.replace(nextPath ?? '/SignInLogin/onboarding/UserInfo1');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Required"
      title="Privacy and terms"
      subtitle="Review the policies that govern how the app handles your data and access."
      bodyStyle={styles.body}
      scrollable={false}
    >
      {loadingState ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={ui.tones.accentStrong} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.tabRow}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => setTab('privacy')}
              style={[styles.tabButton, tab === 'privacy' ? styles.tabButtonActive : null]}
            >
              <Text
                style={[styles.tabText, tab === 'privacy' ? styles.tabTextActive : null]}
              >
                Privacy policy
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() => setTab('terms')}
              style={[styles.tabButton, tab === 'terms' ? styles.tabButtonActive : null]}
            >
              <Text style={[styles.tabText, tab === 'terms' ? styles.tabTextActive : null]}>
                Terms
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.docCard}>
            {tab === 'privacy' ? (
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.docText}>{PRIVACY_POLICY_TEXT}</Text>
              </ScrollView>
            ) : (
              <ScrollView
                showsVerticalScrollIndicator={false}
                onScroll={(event) => {
                  if (!termsReadToEnd && isScrolledToBottom(event)) {
                    setTermsReadToEnd(true);
                  }
                }}
                scrollEventThrottle={16}
              >
                <Text style={styles.docText}>{TERMS_TEXT}</Text>
                <View style={styles.docBottomSpacer} />
              </ScrollView>
            )}
          </View>

          <TouchableOpacity
            activeOpacity={0.92}
            onPress={handleAcceptPress}
            disabled={!canToggleAgree && !accepted}
            style={[
              styles.acceptRow,
              !termsReadToEnd && !accepted ? styles.acceptRowDisabled : null,
            ]}
          >
            <View style={[styles.checkbox, accepted ? styles.checkboxChecked : null]}>
              {accepted ? <Ionicons name="checkmark" size={16} color={colors.blkText} /> : null}
            </View>

            <View style={styles.acceptCopy}>
              <Text style={styles.acceptTitle}>I agree to the Privacy Policy and Terms.</Text>
              <Text style={styles.acceptSubtitle}>
                {!accepted && !termsReadToEnd
                  ? 'Scroll to the bottom of the Terms before you can agree.'
                  : 'The app cannot be used until you accept.'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      <AuthButton
        label="Accept and continue"
        onPress={handleSaveAndContinue}
        disabled={!canContinue}
        loading={saving}
      />

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
    body: {
      flex: 1,
    },
    loadingState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      flex: 1,
      gap: 14,
    },
    tabRow: {
      flexDirection: 'row',
      gap: 10,
    },
    tabButton: {
      ...ui.fragments.tabButton,
    },
    tabButtonActive: {
      ...ui.fragments.tabButtonActive,
    },
    tabText: {
      ...ui.fragments.tabText,
    },
    tabTextActive: {
      ...ui.fragments.tabTextActive,
    },
    docCard: {
      ...ui.fragments.card,
      flex: 1,
      padding: 20,
    },
    docText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 21,
    },
    docBottomSpacer: {
      height: 24,
    },
    acceptRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderRadius: 22,
      padding: 16,
      backgroundColor: ui.fragments.selectionCard.backgroundColor,
      borderWidth: 1,
      borderColor: colors.border,
    },
    acceptRowDisabled: {
      opacity: 0.6,
    },
    checkbox: {
      width: 28,
      height: 28,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    checkboxChecked: {
      backgroundColor: ui.tones.accentStrong,
      borderColor: ui.tones.accentStrong,
    },
    acceptCopy: {
      flex: 1,
    },
    acceptTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    acceptSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
      marginTop: 4,
    },
  });
}
