// app/SignInLogin/onboarding/UserInfo3.tsx
import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from '../components/AppAlert';

import { useOnboardingDraftStore, type AppUsageReason } from '@/lib/onboarding/onboardingDraftStore';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

const USAGE_OPTIONS: Array<{
  key: AppUsageReason;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: 'track_fitness_health',
    title: 'TRACK FITNESS & HEALTH',
    subtitle: 'Track training, consistency, and overall progress.',
    icon: 'pulse-outline',
  },
  {
    key: 'train_for_personal_goal',
    title: 'TRAIN FOR A PERSONAL GOAL',
    subtitle: 'Build toward a race, PR, or body composition goal.',
    icon: 'flag-outline',
  },
  {
    key: 'compete_with_friends',
    title: 'COMPETE WITH FRIENDS',
    subtitle: 'Leaderboards, challenges, and performance comparisons.',
    icon: 'trophy-outline',
  },
  {
    key: 'connect_with_friends',
    title: 'CONNECT WITH FRIENDS',
    subtitle: 'Share sessions, follow friends, and stay accountable.',
    icon: 'people-outline',
  },
  {
    key: 'other',
    title: 'OTHER',
    subtitle: 'A bit of everything—or something unique to you.',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];

export default function UserInfo3() {
  const router = useRouter();
  const { draft, setUsageReasons } = useOnboardingDraftStore();

  const [usage, setUsage] = useState<AppUsageReason[]>(
    Array.isArray(draft.app_usage_reasons) ? draft.app_usage_reasons : []
  );

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

  const canContinue = useMemo(() => usage.length > 0, [usage]);

  const toggleUsage = (key: AppUsageReason) => {
    setUsage((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));
  };

  const [saving, setSaving] = useState(false);

  const handleBack = () => router.replace('./UserInfo2');

  const handleNext = async () => {
    if (!canContinue) {
      showAlert('Select at least one', 'Pick one or more options to continue.');
      return;
    }

    setSaving(true);
    try {
      setUsageReasons(usage);
      router.replace('./UserInfo4');
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

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Why Tensr?</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.stepText}>Step 3/4</Text>

        <ScrollView contentContainerStyle={{ paddingBottom: 22 }}>
          <Text style={styles.title}>What brings you here?</Text>
          <Text style={styles.subtitle}>Select one or more. This helps tailor your experience.</Text>

          <View style={{ marginTop: 12, gap: 12 }}>
            {USAGE_OPTIONS.map((opt) => (
              <OptionCard
                key={opt.key}
                title={opt.title}
                subtitle={opt.subtitle}
                icon={opt.icon}
                selected={usage.includes(opt.key)}
                onPress={() => toggleUsage(opt.key)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, !canContinue ? { opacity: 0.6 } : null]}
            activeOpacity={0.9}
            onPress={handleNext}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <>
                <Text style={styles.primaryBtnText}>Continue</Text>
                <Ionicons name="arrow-forward" size={18} color="#0b0f18" />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <AppAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={handleCloseAlert}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 54 : 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 26, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: TEXT_MUTED, marginTop: 8, marginBottom: 12 },

  title: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '900' },
  subtitle: { color: TEXT_MUTED, marginTop: 6 },

  cardBtn: { borderRadius: 18, padding: 14 },
  cardBtnSelected: { backgroundColor: PRIMARY },
  cardBtnUnselected: { backgroundColor: 'rgba(255,255,255,0.06)' },

  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  cardTitle: { color: TEXT_PRIMARY, fontWeight: '900', fontSize: 13 },
  cardTitleSelected: { color: '#0b0f18' },
  cardSubtitle: { color: TEXT_MUTED, marginTop: 4, fontSize: 12 },
  cardSubtitleSelected: { color: 'rgba(0,0,0,0.7)' },

  trailing: { paddingLeft: 10 },
  checkPill: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#0b0f18', alignItems: 'center', justifyContent: 'center' },
  unchecked: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)' },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#0b0f18', fontWeight: '800', fontSize: 15 },
});