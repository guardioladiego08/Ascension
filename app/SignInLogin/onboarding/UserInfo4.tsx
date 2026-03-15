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
  type JourneyStage,
} from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useAuthDesignSystem } from '../designSystem';

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
  const { draft, setDraft } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const [journey, setJourney] = useState<JourneyStage | null>(
    draft.fitness_journey_stage ?? null
  );

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

  const canContinue = useMemo(() => Boolean(journey), [journey]);

  const handleNext = () => {
    if (!journey) {
      showAlert('Select one', 'Please choose your training stage to continue.');
      return;
    }

    setDraft({ fitness_journey_stage: journey });
    router.replace('/SignInLogin/onboarding/UserInfo5');
  };

  return (
    <AuthScreen
      eyebrow="Step 4 of 5"
      title="Your stage"
      subtitle="This tunes your defaults. Next you’ll pick the app color palette."
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
