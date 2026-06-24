import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

import LogoHeader from '@/components/my components/logoHeader';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { getCurrentBodyMetricSeed, listBodyMetricEntries, upsertBodyMetricEntry } from '@/lib/biometrics/api';
import {
  computeLeanMassKg,
  displayWeightToKg,
  formatBodyMetricDate,
  formatMassFromKg,
  formatNumberInput,
  formatPercent,
  kgToDisplayWeight,
  parseIsoDateOrNull,
  parseNumberOrNull,
  toLocalIsoDate,
} from '@/lib/biometrics/utils';

function FieldCard({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  helper,
  styles,
  placeholderColor,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'decimal-pad';
  helper?: string;
  styles: ReturnType<typeof createStyles>;
  placeholderColor: string;
}) {
  return (
    <View style={styles.fieldCard}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={placeholderColor}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {helper ? <Text style={styles.fieldHelper}>{helper}</Text> : null}
    </View>
  );
}

function SnapshotCard({
  title,
  value,
  detail,
  icon,
  iconColor,
  styles,
}: {
  title: string;
  value: string;
  detail: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.snapshotCard}>
      <View style={styles.snapshotIconWrap}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.snapshotLabel}>{title}</Text>
      <Text style={styles.snapshotValue}>{value}</Text>
      <Text style={styles.snapshotDetail}>{detail}</Text>
    </View>
  );
}

export default function LogBiometricsScreen() {
  const { colors, fonts, globalStyles } = useAppTheme();
  const { weightUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [loggedForDate, setLoggedForDate] = useState(toLocalIsoDate());
  const [weightDisplay, setWeightDisplay] = useState('');
  const [bodyFatDisplay, setBodyFatDisplay] = useState('');
  const [muscleDisplay, setMuscleDisplay] = useState('');
  const [latestSavedDate, setLatestSavedDate] = useState<string | null>(null);

  const loadSeed = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const todayIso = toLocalIsoDate();
      const [seed, recentEntries] = await Promise.all([
        getCurrentBodyMetricSeed(),
        listBodyMetricEntries({ limit: 14, ascending: false }),
      ]);

      const todayEntry =
        recentEntries.find((entry) => entry.loggedForDate === todayIso) ?? null;
      const seedEntry = todayEntry ?? seed.latestEntry;

      setLoggedForDate(todayIso);
      setWeightDisplay(
        seedEntry?.weightKg != null
          ? formatNumberInput(
              kgToDisplayWeight(seedEntry.weightKg, weightUnit)
            )
          : seed.profileWeightKg != null
            ? formatNumberInput(kgToDisplayWeight(seed.profileWeightKg, weightUnit))
            : ''
      );
      setBodyFatDisplay(formatNumberInput(seedEntry?.bodyFatPct ?? null));
      setMuscleDisplay(formatNumberInput(seedEntry?.musclePct ?? null));
      setLatestSavedDate(seed.latestEntry?.loggedForDate ?? null);
    } catch (loadError: any) {
      console.warn('[LogBiometrics] Failed to load seed state', loadError);
      setErrorText(loadError?.message ?? 'Could not load biometrics.');
    } finally {
      setLoading(false);
    }
  }, [weightUnit]);

  useFocusEffect(
    useCallback(() => {
      loadSeed();
      return undefined;
    }, [loadSeed])
  );

  const weightTyped = parseNumberOrNull(weightDisplay);
  const bodyFatTyped = parseNumberOrNull(bodyFatDisplay);
  const muscleTyped = parseNumberOrNull(muscleDisplay);
  const leanMassKg = computeLeanMassKg(
    weightTyped == null ? null : displayWeightToKg(weightTyped, weightUnit),
    bodyFatTyped
  );

  const handleSave = async () => {
    const normalizedDate = parseIsoDateOrNull(loggedForDate);
    if (!normalizedDate) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD for the log date.');
      return;
    }

    if (weightTyped == null && bodyFatTyped == null && muscleTyped == null) {
      Alert.alert('Missing metrics', 'Enter at least one biometric before saving.');
      return;
    }

    if (bodyFatTyped != null && (bodyFatTyped < 0 || bodyFatTyped > 100)) {
      Alert.alert('Invalid body fat', 'Body fat must be between 0 and 100.');
      return;
    }

    if (muscleTyped != null && (muscleTyped < 0 || muscleTyped > 100)) {
      Alert.alert('Invalid muscle percentage', 'Muscle percentage must be between 0 and 100.');
      return;
    }

    try {
      setSaving(true);
      setErrorText(null);

      await upsertBodyMetricEntry({
        loggedForDate: normalizedDate,
        weightKg: weightTyped == null ? null : displayWeightToKg(weightTyped, weightUnit),
        bodyFatPct: bodyFatTyped,
        musclePct: muscleTyped,
      });

      Alert.alert('Saved', 'Your body metrics were updated.');
      router.back();
    } catch (saveError: any) {
      console.error('[LogBiometrics] Save failed', saveError);
      setErrorText(saveError?.message ?? 'Could not save biometrics.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.content]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LogoHeader showBackButton usePreviousRoute />

        <View style={styles.heroCard}>
          <Text style={styles.eyebrow}>Body Check-In</Text>
          <Text style={styles.heading}>Log today’s biometrics</Text>
          <Text style={styles.subtitle}>
            Save weight, body fat, and muscle percentage to update the body progress tab. Saving the
            same date replaces that day’s entry.
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="small" color={colors.highlight1} />
            <Text style={styles.loadingText}>Loading your latest body metrics...</Text>
          </View>
        ) : null}

        {errorText ? (
          <View style={styles.errorCard}>
            <View style={styles.errorRow}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.warning} />
              <Text style={styles.errorText}>{errorText}</Text>
            </View>
            <Pressable accessibilityRole="button" onPress={loadSeed} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.formCard}>
          <FieldCard
            label="Log date"
            value={loggedForDate}
            onChangeText={setLoggedForDate}
            placeholder="YYYY-MM-DD"
            helper="Daily charts key off this date."
            styles={styles}
            placeholderColor={colors.textMuted}
          />
          <FieldCard
            label={`Weight (${weightUnit})`}
            value={weightDisplay}
            onChangeText={setWeightDisplay}
            placeholder={weightUnit === 'lb' ? '180.0' : '81.6'}
            keyboardType="decimal-pad"
            helper="Stored in kilograms behind the scenes."
            styles={styles}
            placeholderColor={colors.textMuted}
          />
          <FieldCard
            label="Body fat (%)"
            value={bodyFatDisplay}
            onChangeText={setBodyFatDisplay}
            placeholder="18.4"
            keyboardType="decimal-pad"
            styles={styles}
            placeholderColor={colors.textMuted}
          />
          <FieldCard
            label="Muscle (%)"
            value={muscleDisplay}
            onChangeText={setMuscleDisplay}
            placeholder="41.2"
            keyboardType="decimal-pad"
            styles={styles}
            placeholderColor={colors.textMuted}
          />
        </View>

        <View style={styles.snapshotGrid}>
          <SnapshotCard
            title="Lean Mass"
            value={formatMassFromKg(leanMassKg, weightUnit, 1)}
            detail="Derived from weight and body fat."
            icon="barbell-outline"
            iconColor={colors.highlight1}
            styles={styles}
          />
          <SnapshotCard
            title="Latest Saved"
            value={latestSavedDate ? formatBodyMetricDate(latestSavedDate) : 'No log yet'}
            detail={
              latestSavedDate
                ? 'Most recent saved body-metrics entry.'
                : 'Save a check-in to start charting trends.'
            }
            icon="calendar-outline"
            iconColor={colors.highlight1}
            styles={styles}
          />
          <SnapshotCard
            title="Body Fat"
            value={formatPercent(bodyFatTyped, 1)}
            detail="Optional field stored as a percentage."
            icon="pie-chart-outline"
            iconColor={colors.highlight1}
            styles={styles}
          />
          <SnapshotCard
            title="Muscle %"
            value={formatPercent(muscleTyped, 1)}
            detail="Optional field stored as a percentage."
            icon="body-outline"
            iconColor={colors.highlight1}
            styles={styles}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving || loading}
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.blkText} />
            ) : (
              <Text style={styles.saveText}>Save Metrics</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    content: {
      paddingBottom: 96,
    },
    heroCard: {
      marginTop: -2,
      gap: 10,
    },
    eyebrow: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    heading: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.9,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 520,
    },
    loadingCard: {
      marginTop: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 18,
      paddingVertical: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    errorCard: {
      marginTop: 18,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.glowSecondary,
      backgroundColor: colors.accentSecondarySoft,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 12,
    },
    errorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    errorText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    retryButton: {
      alignSelf: 'flex-start',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.card3,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    retryText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    formCard: {
      marginTop: 22,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 18,
      gap: 14,
    },
    fieldCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      paddingVertical: 14,
      gap: 8,
    },
    fieldLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    input: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.textInput,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 16,
      lineHeight: 20,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    fieldHelper: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    snapshotGrid: {
      marginTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    snapshotCard: {
      width: '48%',
      minWidth: 148,
      flexGrow: 1,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    snapshotIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
    },
    snapshotLabel: {
      marginTop: 12,
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 13,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    snapshotValue: {
      marginTop: 10,
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 21,
      lineHeight: 25,
      fontVariant: ['tabular-nums'],
    },
    snapshotDetail: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    actions: {
      marginTop: 22,
      flexDirection: 'row',
      gap: 12,
    },
    cancelButton: {
      flex: 1,
      height: 52,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancelText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    saveButton: {
      flex: 1.2,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    saveText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonDisabled: {
      opacity: 0.7,
    },
  });
}
