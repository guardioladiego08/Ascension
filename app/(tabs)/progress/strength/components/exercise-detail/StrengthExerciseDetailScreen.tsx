import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useUnits } from '@/contexts/UnitsContext';
import { getExerciseBodyParts } from '@/lib/strength/exercises';
import { useAppTheme } from '@/providers/AppThemeProvider';

import ExerciseDetailTabs from './ExerciseDetailTabs';
import ExerciseHistoryTab from './ExerciseHistoryTab';
import ExerciseOverviewTab from './ExerciseOverviewTab';
import ExerciseTrendsTab from './ExerciseTrendsTab';
import {
  buildStrengthExerciseDetailModel,
  formatDateBadge,
  type ExerciseDetailTabId,
} from './strengthExerciseDetailUtils';
import { useStrengthExerciseDetail } from './useStrengthExerciseDetail';

export default function StrengthExerciseDetailScreen() {
  const { id, name } = useLocalSearchParams<{ id?: string; name?: string }>();
  const { colors, fonts, globalStyles } = useAppTheme();
  const { weightUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [tabId, setTabId] = useState<ExerciseDetailTabId>('overview');

  const { exercise, summaries, sets, workouts, loading, error, reload } =
    useStrengthExerciseDetail(id);

  const detail = useMemo(
    () => buildStrengthExerciseDetailModel({ summaries, sets, workouts }),
    [sets, summaries, workouts]
  );

  const title =
    (typeof name === 'string' && name.length > 0 ? name : null) ??
    exercise?.exercise_name ??
    'Exercise';
  const bodyParts = exercise ? getExerciseBodyParts(exercise) : [];

  if (loading) {
    return (
      <View style={globalStyles.page}>
        <View style={[globalStyles.safeArea, styles.centered]}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.loadingText}>Loading exercise detail…</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={globalStyles.page}>
        <View style={[globalStyles.safeArea, styles.centered]}>
          <View style={styles.errorCard}>
            <Text style={styles.errorTitle}>Unable to load exercise</Text>
            <Text style={styles.errorText}>{error}</Text>

            <View style={styles.errorButtons}>
              <Pressable onPress={() => router.back()} style={styles.errorButton}>
                <Text style={styles.errorButtonText}>Go Back</Text>
              </Pressable>

              <Pressable onPress={reload} style={styles.errorButton}>
                <Text style={styles.errorButtonText}>Retry</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={globalStyles.page}>
      <View style={globalStyles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.headerRow}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="close-outline" size={22} color={colors.text} />
            </Pressable>

            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>Exercises</Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroEyebrow}>Strength exercise</Text>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroText}>
              Personal records, full set history, and multi-metric progression for
              this movement.
            </Text>

            <View style={styles.badgeRow}>
              {exercise?.workout_category ? (
                <View style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{exercise.workout_category}</Text>
                </View>
              ) : null}

              {bodyParts.map((bodyPart) => (
                <View key={bodyPart} style={styles.heroBadge}>
                  <Text style={styles.heroBadgeText}>{bodyPart}</Text>
                </View>
              ))}
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Sessions tracked</Text>
                <Text style={styles.summaryValue}>{detail.metrics.totalSessions}</Text>
              </View>

              <View style={styles.summaryCard}>
                <Text style={styles.summaryLabel}>Last logged</Text>
                <Text style={styles.summaryValueSmall}>
                  {formatDateBadge(detail.lastLoggedAt)}
                </Text>
              </View>
            </View>
          </View>

          <ExerciseDetailTabs value={tabId} onChange={setTabId} />

          {tabId === 'overview' ? (
            <ExerciseOverviewTab
              detail={detail}
              weightUnit={weightUnit}
              onOpenHistory={() => setTabId('history')}
            />
          ) : null}

          {tabId === 'history' ? (
            <ExerciseHistoryTab detail={detail} weightUnit={weightUnit} />
          ) : null}

          {tabId === 'trends' ? (
            <ExerciseTrendsTab detail={detail} weightUnit={weightUnit} />
          ) : null}
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    loadingText: {
      marginTop: 12,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorCard: {
      width: '100%',
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.glowSecondary,
      backgroundColor: colors.accentSecondarySoft,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 10,
    },
    errorTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 19,
      lineHeight: 23,
    },
    errorText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    errorButtons: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 6,
    },
    errorButton: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card3,
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    errorButtonText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 36,
      gap: 18,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingTop: 4,
    },
    backButton: {
      width: 44,
      height: 44,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitleWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.textMuted,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    headerSpacer: {
      width: 44,
    },
    heroCard: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 18,
      paddingVertical: 18,
      gap: 10,
    },
    heroEyebrow: {
      color: colors.highlight2,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    heroTitle: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.8,
    },
    heroText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 330,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 2,
    },
    heroBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    heroBadgeText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.55,
      textTransform: 'uppercase',
    },
    summaryRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    summaryCard: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 6,
    },
    summaryLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.55,
      textTransform: 'uppercase',
    },
    summaryValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 22,
      lineHeight: 26,
      fontVariant: ['tabular-nums'],
    },
    summaryValueSmall: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
  });
}
