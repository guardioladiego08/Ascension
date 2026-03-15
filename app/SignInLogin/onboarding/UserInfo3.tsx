import React, { useMemo, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../components/AuthScreen';
import AuthButton from '../components/AuthButton';
import AppAlert from '../components/AppAlert';
import {
  useOnboardingDraftStore,
  type AppUsageReason,
} from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useAuthDesignSystem } from '../designSystem';

const USAGE_OPTIONS: Array<{
  key: AppUsageReason;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: 'track_fitness_health',
    title: 'Track fitness and health',
    subtitle: 'Track training, consistency, and overall progress.',
    icon: 'pulse-outline',
  },
  {
    key: 'train_for_personal_goal',
    title: 'Train for a personal goal',
    subtitle: 'Build toward a race, PR, or body composition goal.',
    icon: 'flag-outline',
  },
  {
    key: 'compete_with_friends',
    title: 'Compete with friends',
    subtitle: 'Leaderboards, challenges, and performance comparisons.',
    icon: 'trophy-outline',
  },
  {
    key: 'connect_with_friends',
    title: 'Connect with friends',
    subtitle: 'Share sessions, follow friends, and stay accountable.',
    icon: 'people-outline',
  },
  {
    key: 'other',
    title: 'Other',
    subtitle: 'A mix of features or something specific to your routine.',
    icon: 'ellipsis-horizontal-circle-outline',
  },
];

export default function UserInfo3() {
  const router = useRouter();
  const { draft, setUsageReasons } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const [usage, setUsage] = useState<AppUsageReason[]>(
    Array.isArray(draft.app_usage_reasons) ? draft.app_usage_reasons : []
  );
  const [saving, setSaving] = useState(false);

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
    setUsage((current) =>
      current.includes(key) ? current.filter((item) => item !== key) : [...current, key]
    );
  };

  const handleNext = async () => {
    if (!canContinue) {
      showAlert('Select at least one', 'Pick one or more options to continue.');
      return;
    }

    setSaving(true);
    try {
      setUsageReasons(usage);
      router.replace('/SignInLogin/onboarding/UserInfo4');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Step 3 of 5"
      title="Why Tensr?"
      subtitle="Select the jobs you want this app to do well so the experience starts in the right place."
      showBackButton
      backTo="/SignInLogin/onboarding/UserInfo2"
      bodyStyle={styles.body}
      scrollable={false}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {USAGE_OPTIONS.map((option) => {
          const selected = usage.includes(option.key);
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.92}
              onPress={() => toggleUsage(option.key)}
              style={[styles.cardButton, selected ? styles.cardButtonSelected : null]}
            >
              <View style={styles.cardRow}>
                <View style={[styles.iconWrap, selected ? styles.iconWrapSelected : null]}>
                  <Ionicons
                    name={option.icon}
                    size={22}
                    color={selected ? ui.tones.accentStrong : colors.textMuted}
                  />
                </View>

                <View style={styles.cardCopy}>
                  <Text style={[styles.cardTitle, selected ? styles.cardTitleSelected : null]}>
                    {option.title}
                  </Text>
                  <Text
                    style={[styles.cardSubtitle, selected ? styles.cardSubtitleSelected : null]}
                  >
                    {option.subtitle}
                  </Text>
                </View>

                {selected ? (
                  <View style={styles.checkPill}>
                    <Ionicons name="checkmark" size={16} color={colors.blkText} />
                  </View>
                ) : (
                  <View style={styles.unchecked} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <AuthButton
        label="Continue"
        icon="arrow-forward"
        onPress={handleNext}
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
    scroll: {
      flex: 1,
    },
    content: {
      gap: 12,
      paddingBottom: 8,
    },
    cardButton: {
      ...ui.fragments.selectionCard,
    },
    cardButtonSelected: {
      ...ui.fragments.selectionCardSelected,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    iconWrap: {
      ...ui.fragments.selectionIconWrap,
    },
    iconWrapSelected: {
      ...ui.fragments.selectionIconWrapSelected,
    },
    cardCopy: {
      flex: 1,
    },
    cardTitle: {
      ...ui.fragments.selectionTitle,
    },
    cardTitleSelected: {
      ...ui.fragments.selectionTitleSelected,
    },
    cardSubtitle: {
      ...ui.fragments.selectionSubtitle,
    },
    cardSubtitleSelected: {
      ...ui.fragments.selectionSubtitleSelected,
    },
    checkPill: {
      ...ui.fragments.checkPill,
    },
    unchecked: {
      ...ui.fragments.unchecked,
    },
  });
}
