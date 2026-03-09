import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../components/AuthScreen';
import AppAlert from '../components/AppAlert';
import { withAlpha } from '@/constants/Colors';
import {
  useOnboardingDraftStore,
  type AppUsageReason,
} from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';

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
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
      eyebrow="Step 3 of 4"
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
                    color={selected ? colors.blkText : colors.textMuted}
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

      <TouchableOpacity
        style={[styles.primaryButton, !canContinue ? styles.buttonDisabled : null]}
        activeOpacity={0.92}
        onPress={handleNext}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.blkText} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.blkText} />
          </>
        )}
      </TouchableOpacity>

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
      borderRadius: 24,
      padding: 18,
      backgroundColor: withAlpha(colors.surface, 0.92),
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    cardRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
    },
    iconWrapSelected: {
      backgroundColor: withAlpha(colors.blkText, 0.12),
    },
    cardCopy: {
      flex: 1,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
    cardTitleSelected: {
      color: colors.blkText,
    },
    cardSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 4,
    },
    cardSubtitleSelected: {
      color: withAlpha(colors.blkText, 0.72),
    },
    checkPill: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: withAlpha(colors.blkText, 0.12),
    },
    unchecked: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 1.5,
      borderColor: colors.borderStrong,
    },
    primaryButton: {
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.62,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
  });
}
