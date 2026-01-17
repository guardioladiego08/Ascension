// app/SignInLogin/onboarding/TermsAndPrivacy.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from '../components/AppAlert';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

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

function isScrolledToBottom(e: NativeSyntheticEvent<NativeScrollEvent>, thresholdPx = 24) {
  const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
  return layoutMeasurement.height + contentOffset.y >= contentSize.height - thresholdPx;
}

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

function buildFallbackUsername(email: string | null | undefined, userId: string) {
  const baseRaw = (email?.split('@')?.[0] ?? 'user') + '_' + userId.slice(0, 6);
  let u = sanitizeUsername(baseRaw);
  if (u.length < 3) u = `user_${userId.slice(0, 6)}`;
  if (u.length > 30) u = u.slice(0, 30);
  return u;
}

export default function TermsAndPrivacy() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const nextPath = Array.isArray(params.nextPath) ? params.nextPath[0] : params.nextPath;

  const [tab, setTab] = useState<'privacy' | 'terms'>('privacy');

  // Once accepted, user cannot un-accept (UI enforces one-way)
  const [accepted, setAccepted] = useState(false);

  const [loadingState, setLoadingState] = useState(true);
  const [saving, setSaving] = useState(false);

  // Scroll gate: user must scroll to bottom of TERMS before they can check agree
  const [termsReadToEnd, setTermsReadToEnd] = useState(false);

  // Alerts
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
          error: userErr,
        } = await supabase.auth.getUser();

        if (userErr || !user) {
          showAlert('Auth error', 'You are not signed in. Please sign in again.');
          return;
        }

        // Ensure profile exists (username + display_name NOT NULL safe)
        const metaUsername =
          (user.user_metadata as any)?.username?.trim?.() ||
          (user.user_metadata as any)?.Username?.trim?.() ||
          '';

        const username = (() => {
          const s = sanitizeUsername(metaUsername);
          if (s.length >= 3) return s;
          return buildFallbackUsername(user.email, user.id);
        })();

        const metaDisplayName =
          (user.user_metadata as any)?.display_name?.trim?.() ||
          (user.user_metadata as any)?.displayName?.trim?.() ||
          '';

        const displayName = (metaDisplayName || username).trim();

        const { error: ensureErr } = await supabase
          .schema('public')
          .from('profiles')
          .upsert(
            { id: user.id, username, display_name: displayName },
            { onConflict: 'id' },
          );

        if (ensureErr) {
          showAlert('Error', ensureErr.message);
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

        // If already accepted, no need to enforce scroll gate
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
    if (accepted) return false; // one-way lock
    return termsReadToEnd;
  }, [accepted, termsReadToEnd]);

  const canContinue = useMemo(() => accepted === true, [accepted]);

  const handleAcceptPress = () => {
    if (accepted) return; // one-way
    if (!termsReadToEnd) {
      showAlert('Read Terms', 'Please scroll to the bottom of the Terms before you can agree.');
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
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
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
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LogoHeader />

        <View style={styles.topRow}>
          <View style={styles.topTextBlock}>
            <Text style={styles.topTitle}>PRIVACY & TERMS</Text>
            <Text style={styles.topStep}>REQUIRED</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        {loadingState ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator />
          </View>
        ) : (
          <View style={{ flex: 1 }}>
            {/* Tabs */}
            <View style={styles.tabRow}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setTab('privacy')}
                style={[styles.tabBtn, tab === 'privacy' ? styles.tabBtnActive : styles.tabBtnInactive]}
              >
                <Text style={[styles.tabText, tab === 'privacy' ? styles.tabTextActive : styles.tabTextInactive]}>
                  PRIVACY POLICY
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => setTab('terms')}
                style={[styles.tabBtn, tab === 'terms' ? styles.tabBtnActive : styles.tabBtnInactive]}
              >
                <Text style={[styles.tabText, tab === 'terms' ? styles.tabTextActive : styles.tabTextInactive]}>
                  TERMS
                </Text>
              </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.docCard}>
              {tab === 'privacy' ? (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.docText}>{PRIVACY_POLICY_TEXT}</Text>
                </ScrollView>
              ) : (
                <ScrollView
                  showsVerticalScrollIndicator={false}
                  onScroll={(e) => {
                    if (!termsReadToEnd && isScrolledToBottom(e)) {
                      setTermsReadToEnd(true);
                    }
                  }}
                  scrollEventThrottle={16}
                >
                  <Text style={styles.docText}>{TERMS_TEXT}</Text>
                  <View style={{ height: 24 }} />
                </ScrollView>
              )}
            </View>

            {/* Acceptance */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleAcceptPress}
              disabled={!canToggleAgree && !accepted}
              style={[
                styles.acceptRow,
                !termsReadToEnd && !accepted ? { opacity: 0.55 } : null,
              ]}
            >
              <View style={[styles.checkbox, accepted ? styles.checkboxChecked : styles.checkboxUnchecked]}>
                {accepted ? <Ionicons name="checkmark" size={16} color="#0b0f18" /> : null}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.acceptTitle}>I agree to the Privacy Policy and Terms.</Text>
                {!accepted && !termsReadToEnd ? (
                  <Text style={styles.acceptSubtitle}>
                    Scroll to the bottom of the Terms to enable agreement.
                  </Text>
                ) : (
                  <Text style={styles.acceptSubtitle}>
                    The app cannot be used until you accept.
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.nextButton,
            !canContinue ? { opacity: 0.35 } : null,
            saving ? { opacity: 0.7 } : null,
          ]}
          activeOpacity={0.9}
          onPress={handleSaveAndContinue}
          disabled={!canContinue || saving}
        >
          {saving ? <ActivityIndicator /> : <Text style={styles.nextText}>ACCEPT & CONTINUE</Text>}
        </TouchableOpacity>

        <AppAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleCloseAlert} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  topTextBlock: { flex: 1, paddingLeft: 12 },
  topTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  topStep: { marginTop: 2, color: TEXT_MUTED, fontSize: 12, fontWeight: '600', letterSpacing: 1.1 },

  tabRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tabBtn: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: { backgroundColor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.18)' },
  tabBtnInactive: { backgroundColor: 'rgba(176,176,176,0.10)', borderColor: 'rgba(123,123,123,0.55)' },
  tabText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  tabTextActive: { color: TEXT_PRIMARY },
  tabTextInactive: { color: 'rgba(255,255,255,0.60)' },

  docCard: {
    flex: 1,
    marginTop: 12,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(123,123,123,0.55)',
    backgroundColor: 'rgba(176,176,176,0.10)',
    padding: 16,
  },
  docText: {
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },

  acceptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(123,123,123,0.55)',
    backgroundColor: 'rgba(176,176,176,0.10)',
    padding: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxUnchecked: {
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'transparent',
  },
  checkboxChecked: {
    backgroundColor: '#fff',
    borderWidth: 0,
  },
  acceptTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '800' },
  acceptSubtitle: { marginTop: 4, color: TEXT_MUTED, fontSize: 12, fontWeight: '600' },

  nextButton: {
    marginTop: 18,
    marginBottom: 26,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: PRIMARY, fontSize: 14, fontWeight: '900', letterSpacing: 1.6 },
});
