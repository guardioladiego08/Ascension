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
import { submitOnboardingDraftToUserUsers } from '@/lib/onboarding/auth_onboarding_submit';
import { useOnboardingDraftStore } from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useAuthDesignSystem } from '../designSystem';
import {
  getThemePaletteOption,
  type ThemePaletteId,
} from '@/constants/Colors';

const PALETTE_USE_LABELS: Record<ThemePaletteId, string> = {
  neon_performance: 'Endurance • Effort • Recovery',
  aurora_gradient: 'Cardio • Strength • Intensity',
  solar_activity: 'Movement • Endurance • Intensity',
  cyber_fitness: 'Cardio • Strength • Goals',
  nature_athlete: 'Recovery • Endurance • Activity',
};

export default function UserInfo5() {
  const router = useRouter();
  const { draft, resetDraft } = useOnboardingDraftStore();
  const {
    colors,
    fonts,
    paletteOptions,
    selectedPaletteId,
    setSelectedPaletteId,
  } = useAppTheme();
  const ui = useAuthDesignSystem();
  const styles = useMemo(() => createStyles(colors, fonts, ui), [colors, fonts, ui]);

  const [paletteId, setPaletteId] = useState<ThemePaletteId>(selectedPaletteId);
  const [saving, setSaving] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');

  const showAlert = (title: string, message: string) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const handleCloseAlert = () => setAlertVisible(false);

  const selectedPalette = useMemo(
    () => getThemePaletteOption(paletteId),
    [paletteId]
  );

  const handleSelectPalette = (nextPaletteId: ThemePaletteId) => {
    setPaletteId(nextPaletteId);
    void setSelectedPaletteId(nextPaletteId);
  };

  const handleFinish = async () => {
    setSaving(true);
    try {
      await setSelectedPaletteId(paletteId);
      await submitOnboardingDraftToUserUsers(draft);
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
      eyebrow="Step 5 of 5"
      title="Pick your palette"
      subtitle="This applies app-wide through your theme settings and can be changed later."
      showBackButton
      backTo="/SignInLogin/onboarding/UserInfo4"
      bodyStyle={styles.body}
      scrollable={false}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewCard}>
          <Text style={styles.previewEyebrow}>Theme preview</Text>
          <Text style={styles.previewTitle}>{selectedPalette.name}</Text>
          <Text style={styles.previewSubtitle}>
            {PALETTE_USE_LABELS[selectedPalette.id]}
          </Text>

          <View style={styles.previewMetricRow}>
            <View style={styles.previewMetricCard}>
              <Text style={styles.previewMetricLabel}>Today</Text>
              <Text style={styles.previewMetricValue}>2/3 goals</Text>
            </View>
            <View style={styles.previewMetricCard}>
              <Text style={styles.previewMetricLabel}>Calories</Text>
              <Text style={styles.previewMetricValue}>78%</Text>
            </View>
          </View>

          <View style={styles.previewBarStack}>
            <View style={styles.previewBarTrack}>
              <View
                style={[
                  styles.previewBarFill,
                  { width: '66%', backgroundColor: selectedPalette.trio.primary },
                ]}
              />
            </View>
            <View style={styles.previewBarTrack}>
              <View
                style={[
                  styles.previewBarFill,
                  { width: '48%', backgroundColor: selectedPalette.trio.secondary },
                ]}
              />
            </View>
            <View style={styles.previewBarTrack}>
              <View
                style={[
                  styles.previewBarFill,
                  { width: '84%', backgroundColor: selectedPalette.trio.tertiary },
                ]}
              />
            </View>
          </View>

          <View style={styles.previewSwatchRow}>
            <View
              style={[styles.previewSwatch, { backgroundColor: selectedPalette.trio.primary }]}
            />
            <View
              style={[styles.previewSwatch, { backgroundColor: selectedPalette.trio.secondary }]}
            />
            <View
              style={[styles.previewSwatch, { backgroundColor: selectedPalette.trio.tertiary }]}
            />
          </View>
        </View>

        {paletteOptions.map((palette) => {
          const selected = palette.id === paletteId;
          return (
            <TouchableOpacity
              key={palette.id}
              activeOpacity={0.92}
              onPress={() => handleSelectPalette(palette.id)}
              style={[styles.cardButton, selected ? styles.cardButtonSelected : null]}
            >
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderCopy}>
                  <Text style={styles.cardTitle}>{palette.name}</Text>
                  <Text style={styles.cardSubtitle}>{palette.description}</Text>
                </View>

                {selected ? (
                  <View style={styles.checkPill}>
                    <Ionicons name="checkmark" size={16} color={colors.blkText} />
                  </View>
                ) : (
                  <View style={styles.unchecked} />
                )}
              </View>

              <Text style={styles.cardUseLabel}>
                {PALETTE_USE_LABELS[palette.id]}
              </Text>

              <View style={styles.swatchRow}>
                <View
                  style={[styles.swatch, { backgroundColor: palette.trio.primary }]}
                />
                <View
                  style={[styles.swatch, { backgroundColor: palette.trio.secondary }]}
                />
                <View
                  style={[styles.swatch, { backgroundColor: palette.trio.tertiary }]}
                />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <AuthButton
        label="Finish"
        icon="checkmark-circle"
        onPress={handleFinish}
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
    previewCard: {
      backgroundColor: colors.card2,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      marginBottom: 4,
    },
    previewEyebrow: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    previewTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
      marginTop: 8,
    },
    previewSubtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    previewMetricRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    previewMetricCard: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingVertical: 10,
      paddingHorizontal: 10,
    },
    previewMetricLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    previewMetricValue: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      marginTop: 6,
    },
    previewBarStack: {
      marginTop: 14,
      gap: 8,
    },
    previewBarTrack: {
      height: 8,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.surfaceRaised,
    },
    previewBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    previewSwatchRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    previewSwatch: {
      width: 24,
      height: 24,
      borderRadius: 12,
    },
    cardButton: {
      ...ui.fragments.selectionCard,
    },
    cardButtonSelected: {
      ...ui.fragments.selectionCardSelected,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    cardHeaderCopy: {
      flex: 1,
    },
    cardTitle: {
      ...ui.fragments.selectionTitle,
    },
    cardSubtitle: {
      ...ui.fragments.selectionSubtitle,
      marginTop: 2,
    },
    cardUseLabel: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      marginTop: 12,
    },
    swatchRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 10,
    },
    swatch: {
      width: 26,
      height: 26,
      borderRadius: 13,
    },
    checkPill: {
      ...ui.fragments.checkPill,
    },
    unchecked: {
      ...ui.fragments.unchecked,
    },
  });
}
