// app/SignInLogin/onboarding/UserInfo4.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
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

type Params = { authUserId?: string };

type JourneyStage =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'returning_from_break'
  | 'elite';

const JOURNEY_OPTIONS: Array<{
  key: JourneyStage;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'beginner', title: 'BEGINNER', subtitle: 'New to structured training.', icon: 'leaf-outline' },
  { key: 'returning_from_break', title: 'GETTING BACK INTO IT', subtitle: 'Restarting after time off.', icon: 'refresh-outline' },
  { key: 'intermediate', title: 'INTERMEDIATE', subtitle: 'Consistent, building performance.', icon: 'trending-up-outline' },
  { key: 'advanced', title: 'ADVANCED', subtitle: 'Highly consistent, structured training.', icon: 'flash-outline' },
  { key: 'elite', title: 'ELITE', subtitle: 'Performance-driven, competing at a high level.', icon: 'trophy-outline' },
];

export default function UserInfo4() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const authUserId = Array.isArray(params.authUserId) ? params.authUserId[0] : params.authUserId;

  const [journey, setJourney] = useState<JourneyStage | null>(null);

  // Alerts
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

  // Prefill
  useEffect(() => {
    const load = async () => {
      if (!authUserId) return;

      const { data, error } = await supabase
        .schema('user')
        .from('profiles')
        .select('fitness_journey_stage')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error || !data) return;

      if (data.fitness_journey_stage) {
        setJourney(String(data.fitness_journey_stage) as JourneyStage);
      }
    };

    load();
  }, [authUserId]);

  const canContinue = useMemo(() => !!journey, [journey]);
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!authUserId) {
      showAlert('Error', 'Missing auth user id.');
      return;
    }
    if (!journey) {
      showAlert('Missing info', 'Please select where you are on your fitness journey.');
      return;
    }

    setSaving(true);
    try {
      // Always verify auth session (prevents "not signed in" saves)
      const {
        data: { user },
        error: userErr,
      } = await supabase.auth.getUser();

      if (userErr || !user) {
        showAlert('Auth error', 'You are not signed in. Please sign in again.');
        return;
      }

      // Ensure profile exists with username (NOT NULL safety)
      const metaUsername =
        (user.user_metadata as any)?.username?.trim?.() ||
        (user.user_metadata as any)?.Username?.trim?.();

      const fallbackUsername = `${(user.email?.split('@')[0] ?? 'user')}_${user.id.slice(0, 6)}`;

      const { error: ensureErr } = await supabase
        .schema('user')
        .from('profiles')
        .upsert(
          {
            auth_user_id: user.id,
            username: metaUsername || fallbackUsername,
          },
          { onConflict: 'auth_user_id' },
        );

      if (ensureErr) {
        console.log('[UserInfo4] ensure profile error', ensureErr);
        showAlert('Error', ensureErr.message);
        return;
      }

      // Save the journey stage AND mark onboarding complete
      const { error } = await supabase
        .schema('user')
        .from('profiles')
        .update({
          fitness_journey_stage: journey,
          onboarding_completed: true, // ✅ mark complete here (boolean)
        })
        .eq('auth_user_id', authUserId);

      if (error) {
        console.log('[UserInfo4] save error', error);
        showAlert('Error', error.message);
        return;
      }

      // Next: force Terms/Privacy gate before app access
      // After acceptance, go to home (since onboarding_completed is true)
      router.replace({
        pathname: './TermsAndPrivacy',
        params: { nextPath: '/(tabs)/home' },
      });
    } finally {
      setSaving(false);
    }
  };

  const OptionCard = ({
    title,
    subtitle,
    icon,
    selected,
    onPress,
  }: {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    onPress: () => void;
  }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.cardBtn, selected ? styles.cardBtnSelected : styles.cardBtnUnselected]}
      >
        <View style={styles.cardRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={icon} size={22} color={selected ? '#0b0f18' : 'rgba(255,255,255,0.55)'} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, selected ? styles.cardTitleSelected : null]}>{title}</Text>
            <Text style={[styles.cardSubtitle, selected ? styles.cardSubtitleSelected : null]}>{subtitle}</Text>
          </View>

          <View style={styles.trailing}>
            {selected ? (
              <View style={styles.checkPill}>
                <Ionicons name="checkmark" size={16} color="#0b0f18" />
              </View>
            ) : (
              <View style={styles.unchecked} />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
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

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.topRow}>
            <View style={styles.topTextBlock}>
              <Text style={styles.topTitle}>GOALS</Text>
              <Text style={styles.topStep}>STEP 4/5</Text>
            </View>
            <View style={{ width: 44 }} />
          </View>

          <View style={styles.headerBlock}>
            <Text style={styles.h1}>Where are you on your fitness journey?</Text>
            <Text style={styles.h2}>Choose one option.</Text>
          </View>

          <View style={{ gap: 12 }}>
            {JOURNEY_OPTIONS.map((o) => (
              <OptionCard
                key={o.key}
                title={o.title}
                subtitle={o.subtitle}
                icon={o.icon}
                selected={journey === o.key}
                onPress={() => setJourney(o.key)}
              />
            ))}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={[
            styles.nextButton,
            !canContinue ? { opacity: 0.35 } : null,
            saving ? { opacity: 0.7 } : null,
          ]}
          activeOpacity={0.9}
          onPress={handleNext}
          disabled={!canContinue || saving}
        >
          {saving ? <ActivityIndicator /> : <Text style={styles.nextText}>NEXT</Text>}
        </TouchableOpacity>

        <AppAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleCloseAlert} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  scrollContent: { paddingBottom: 22 },
  topTextBlock: { flex: 1, paddingLeft: 12 },
  topTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '800', letterSpacing: 1.4 },
  topStep: { marginTop: 2, color: TEXT_MUTED, fontSize: 12, fontWeight: '600', letterSpacing: 1.1 },

  headerBlock: { marginTop: 14, marginBottom: 12 },
  h1: { color: TEXT_PRIMARY, fontSize: 24, fontWeight: '700' },
  h2: { marginTop: 8, color: TEXT_MUTED, fontSize: 14, fontWeight: '500' },

  cardBtn: {
    borderRadius: 16,
    borderWidth: 1.5,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  cardBtnSelected: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  cardBtnUnselected: {
    backgroundColor: 'rgba(176,176,176,0.12)',
    borderColor: 'rgba(123,123,123,0.55)',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.10)',
  },

  cardTitle: { color: TEXT_PRIMARY, fontSize: 14, fontWeight: '900', letterSpacing: 1.4 },
  cardSubtitle: { marginTop: 4, color: 'rgba(255,255,255,0.55)', fontSize: 14, fontWeight: '500' },
  cardTitleSelected: { color: TEXT_PRIMARY },
  cardSubtitleSelected: { color: 'rgba(255,255,255,0.72)' },

  trailing: { width: 34, alignItems: 'flex-end', justifyContent: 'center' },
  unchecked: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  checkPill: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
  nextText: { color: PRIMARY, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
});
