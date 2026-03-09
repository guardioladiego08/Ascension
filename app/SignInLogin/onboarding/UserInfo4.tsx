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
  type JourneyStage,
} from '@/lib/onboarding/onboardingDraftStore';
import { submitOnboardingDraftToUserUsers } from '@/lib/onboarding/auth_onboarding_submit';
import { useAppTheme } from '@/providers/AppThemeProvider';

const JOURNEY_OPTIONS: Array<{
  key: JourneyStage;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: 'beginner',
    title: 'Beginner',
    subtitle: 'New to structured training.',
    icon: 'leaf-outline',
  },
  {
    key: 'returning_from_break',
    title: 'Getting back into it',
    subtitle: 'Returning after time off.',
    icon: 'refresh-outline',
  },
  {
    key: 'intermediate',
    title: 'Intermediate',
    subtitle: 'Consistent training, building momentum.',
    icon: 'trending-up-outline',
  },
  {
    key: 'advanced',
    title: 'Advanced',
    subtitle: 'Strong routine and performance focus.',
    icon: 'rocket-outline',
  },
  {
    key: 'elite',
    title: 'Elite',
    subtitle: 'Highly structured training and performance work.',
    icon: 'flash-outline',
  },
];

export default function UserInfo4() {
  const router = useRouter();
  const { draft, setDraft, resetDraft } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [journey, setJourney] = useState<JourneyStage | null>(
    draft.fitness_journey_stage ?? null
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

  const canFinish = useMemo(() => Boolean(journey), [journey]);

  const handleFinish = async () => {
    if (!journey) {
      showAlert('Select one', 'Please choose your training stage to continue.');
      return;
    }

    setSaving(true);
    try {
      setDraft({ fitness_journey_stage: journey });

      await submitOnboardingDraftToUserUsers({
        ...draft,
        fitness_journey_stage: journey,
      });

      resetDraft();
      router.replace('/(tabs)/home');
    } catch (error: any) {
      showAlert('Error', error?.message ?? 'Could not complete onboarding. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthScreen
      eyebrow="Step 4 of 4"
      title="Your stage"
      subtitle="This tunes the starting assumptions behind insights, suggestions, and defaults."
      showBackButton
      backTo="/SignInLogin/onboarding/UserInfo3"
      bodyStyle={styles.body}
      scrollable={false}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {JOURNEY_OPTIONS.map((option) => {
          const selected = journey === option.key;
          return (
            <TouchableOpacity
              key={option.key}
              activeOpacity={0.92}
              onPress={() => setJourney(option.key)}
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
        style={[styles.primaryButton, !canFinish ? styles.buttonDisabled : null]}
        activeOpacity={0.92}
        onPress={handleFinish}
        disabled={saving}
      >
        {saving ? (
          <ActivityIndicator color={colors.blkText} />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>Finish</Text>
            <Ionicons name="checkmark-circle" size={18} color={colors.blkText} />
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
