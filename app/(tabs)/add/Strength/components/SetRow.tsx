import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import type { PreviousExerciseSetSuggestion, SetDraft } from '@/lib/strength/types';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';
import { HOME_TONES } from '../../../home/tokens';

const LB_PER_KG = 2.20462;

const convertBetweenUnits = (
  weight: number,
  from: 'kg' | 'lb',
  to: 'kg' | 'lb'
): number => {
  if (from === to) return weight;
  if (from === 'lb' && to === 'kg') return weight / LB_PER_KG;
  if (from === 'kg' && to === 'lb') return weight * LB_PER_KG;
  return weight;
};

const toKg = (weight: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? weight : weight / LB_PER_KG;

const trimToSingleDecimal = (value: string): string => {
  const normalized = value.replace(',', '.').replace(/[^0-9.]/g, '');
  const [wholePart = '', ...decimalParts] = normalized.split('.');
  const safeWhole = wholePart.replace(/^0+(?=\d)/, '');
  if (decimalParts.length === 0) {
    return safeWhole;
  }
  const decimal = decimalParts.join('').slice(0, 1);
  return decimal.length > 0 ? `${safeWhole || '0'}.${decimal}` : `${safeWhole || '0'}.`;
};

const formatSingleDecimal = (value: number | undefined): string =>
  value == null || Number.isNaN(value) ? '' : value.toFixed(1).replace(/\.0$/, '');

const computeEst1RM = (
  storedWeight: number | undefined,
  reps: number | undefined,
  storedUnit: 'kg' | 'lb'
): number | null => {
  if (!storedWeight || !reps || reps <= 0) return null;
  const wKg = toKg(storedWeight, storedUnit);
  const est = wKg * (1 + reps / 30);
  return +est.toFixed(2);
};

const modeLabel: Record<SetDraft['set_type'], string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  dropset: 'Drop set',
  failure: 'Failure',
};

const modeLetter: Record<SetDraft['set_type'], string> = {
  normal: '',
  warmup: 'W',
  dropset: 'D',
  failure: 'F',
};

type Props = {
  setDraft: SetDraft;
  displayIndex: number | null;
  suggestedSet?: PreviousExerciseSetSuggestion;
  onChange: (s: SetDraft) => void;
  onToggleComplete: (nextDone: boolean) => void;
  completionDisabled?: boolean;
};

const SetRow: React.FC<Props> = ({
  setDraft,
  displayIndex,
  suggestedSet,
  onChange,
  onToggleComplete,
  completionDisabled = false,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [modeVisible, setModeVisible] = useState(false);
  const [weightText, setWeightText] = useState('');
  const [repsText, setRepsText] = useState('');
  const [weightFocused, setWeightFocused] = useState(false);
  const [repsFocused, setRepsFocused] = useState(false);
  const { weightUnit: viewerUnit } = useUnits();

  const handleSelectMode = (mode: SetDraft['set_type']) => {
    onChange({ ...setDraft, set_type: mode });
    setModeVisible(false);
  };

  const letter = modeLetter[setDraft.set_type];
  const showNumber = setDraft.set_type === 'normal' && displayIndex != null;

  const storedUnit: 'kg' | 'lb' =
    setDraft.weight_unit_csv === 'kg' || setDraft.weight_unit_csv === 'lb'
      ? setDraft.weight_unit_csv
      : viewerUnit;

  const storedWeight = setDraft.weight ?? undefined;
  const displayWeight =
    storedWeight != null
      ? convertBetweenUnits(storedWeight, storedUnit, viewerUnit)
      : undefined;
  const suggestedWeight = suggestedSet?.weight ?? undefined;
  const suggestedWeightUnitCsv = suggestedSet?.weight_unit_csv ?? undefined;
  const suggestedReps = suggestedSet?.reps ?? undefined;
  const suggestedDisplayWeight =
    suggestedWeight != null &&
    (suggestedWeightUnitCsv === 'kg' || suggestedWeightUnitCsv === 'lb')
      ? convertBetweenUnits(suggestedWeight, suggestedWeightUnitCsv, viewerUnit)
      : undefined;
  const suggestedWeightPlaceholder =
    suggestedDisplayWeight == null || Number.isNaN(suggestedDisplayWeight)
      ? '0'
      : viewerUnit === 'kg'
        ? Number.isInteger(suggestedDisplayWeight)
          ? String(suggestedDisplayWeight)
          : suggestedDisplayWeight.toFixed(1)
        : String(Math.round(suggestedDisplayWeight));
  const suggestedRepsPlaceholder =
    suggestedReps != null && !Number.isNaN(suggestedReps)
      ? String(Math.round(suggestedReps))
      : 'reps';

  useEffect(() => {
    if (!weightFocused) {
      setWeightText(
        displayWeight != null && !Number.isNaN(displayWeight)
          ? formatSingleDecimal(displayWeight)
          : ''
      );
    }
  }, [displayWeight, weightFocused]);

  useEffect(() => {
    if (!repsFocused) {
      setRepsText(formatSingleDecimal(setDraft.reps ?? undefined));
    }
  }, [repsFocused, setDraft.reps]);

  const handleWeightChange = (text: string) => {
    const normalizedText = trimToSingleDecimal(text);
    setWeightText(normalizedText);
    const wDisplay = normalizedText ? Number(normalizedText) : undefined;
    let newStoredWeight: number | undefined;

    if (wDisplay != null && !Number.isNaN(wDisplay)) {
      newStoredWeight = convertBetweenUnits(wDisplay, viewerUnit, storedUnit);
      newStoredWeight = Number(newStoredWeight.toFixed(1));
    }

    const reps = setDraft.reps ?? undefined;
    const est1rm =
      newStoredWeight && reps
        ? computeEst1RM(newStoredWeight, reps, storedUnit)
        : null;

    onChange({
      ...setDraft,
      weight: newStoredWeight,
      weight_unit_csv: storedUnit,
      est_1rm: est1rm ?? undefined,
    });
  };

  const handleRepsChange = (text: string) => {
    const normalizedText = trimToSingleDecimal(text);
    setRepsText(normalizedText);
    const reps = normalizedText ? Number(normalizedText) : undefined;
    const est1rm =
      storedWeight && reps
        ? computeEst1RM(storedWeight, reps, storedUnit)
        : null;

    onChange({
      ...setDraft,
      reps,
      weight_unit_csv: storedUnit,
      est_1rm: est1rm ?? undefined,
    });
  };

  const typeToneStyle =
    setDraft.set_type === 'warmup'
      ? styles.typeToneWarmup
      : setDraft.set_type === 'dropset'
        ? styles.typeToneDropset
          : setDraft.set_type === 'failure'
            ? styles.typeToneFailure
            : null;
  const typeBadgeStyle =
    setDraft.set_type === 'warmup'
      ? styles.idxBtnWarmup
      : setDraft.set_type === 'dropset'
        ? styles.idxBtnDropset
        : setDraft.set_type === 'failure'
          ? styles.idxBtnFailure
          : null;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={[
          styles.idxBtn,
          setDraft.set_type !== 'normal' && styles.idxBtnActive,
          typeBadgeStyle,
        ]}
        onPress={() => setModeVisible(true)}
      >
        {showNumber ? (
          <Text style={styles.idxText}>{displayIndex}</Text>
        ) : (
          <Text style={[styles.typeLetter, typeToneStyle]}>{letter}</Text>
        )}
      </TouchableOpacity>

      <View style={styles.weightWrap}>
        <TextInput
          style={[styles.weightInput, setDraft.done ? styles.inputDone : null]}
          inputMode="decimal"
          placeholder={suggestedWeightPlaceholder}
          placeholderTextColor={HOME_TONES.textTertiary}
          value={weightText}
          onFocus={() => setWeightFocused(true)}
          onBlur={() => setWeightFocused(false)}
          onChangeText={handleWeightChange}
        />
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>{viewerUnit}</Text>
        </View>
      </View>

      <TextInput
        style={[styles.reps, setDraft.done ? styles.repsDone : null]}
        inputMode="numeric"
        placeholder={suggestedRepsPlaceholder}
        placeholderTextColor={HOME_TONES.textTertiary}
        value={repsText}
        onFocus={() => setRepsFocused(true)}
        onBlur={() => setRepsFocused(false)}
        onChangeText={handleRepsChange}
      />

      <TouchableOpacity
        activeOpacity={0.92}
        disabled={completionDisabled}
        style={[
          styles.checkboxBtn,
          setDraft.done ? styles.checkboxBtnDone : null,
          completionDisabled ? styles.checkboxBtnDisabled : null,
        ]}
        onPress={() => onToggleComplete(!Boolean(setDraft.done))}
      >
        <Ionicons
          name={setDraft.done ? 'checkmark-circle' : 'ellipse-outline'}
          size={22}
          color={
            setDraft.done
              ? colors.highlight1
              : completionDisabled
                ? HOME_TONES.textDisabled
                : HOME_TONES.textTertiary
          }
        />
      </TouchableOpacity>

      <AppPopup
        visible={modeVisible}
        onClose={() => setModeVisible(false)}
        eyebrow="Set mode"
        title="Choose a set type"
      >
        {(
          ['normal', 'warmup', 'dropset', 'failure'] as SetDraft['set_type'][]
        ).map((mode) => {
          const active = mode === setDraft.set_type;
          return (
            <TouchableOpacity
              key={mode}
              activeOpacity={0.92}
              style={[styles.modeRow, active ? styles.modeRowActive : null]}
              onPress={() => handleSelectMode(mode)}
            >
              <Text style={[styles.modeText, active ? styles.modeTextActive : null]}>
                {modeLabel[mode]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </AppPopup>
    </View>
  );
};

export default SetRow;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 6,
    },
    idxBtn: {
      width: 38,
      height: 42,
      borderRadius: 14,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    idxBtnActive: {
      backgroundColor: HOME_TONES.surface3,
      borderColor: HOME_TONES.borderSoft,
    },
    idxBtnWarmup: {
      backgroundColor: colors.accentTertiarySoft,
      borderColor: colors.glowTertiary,
    },
    idxBtnDropset: {
      backgroundColor: colors.accentSecondarySoft,
      borderColor: colors.glowSecondary,
    },
    idxBtnFailure: {
      backgroundColor: colors.accentSecondarySoft,
      borderColor: colors.danger,
    },
    idxText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    typeLetter: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    typeToneWarmup: {
      color: colors.highlight3,
    },
    typeToneDropset: {
      color: colors.highlight2,
    },
    typeToneFailure: {
      color: colors.danger,
    },
    weightWrap: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 42,
      borderRadius: 14,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      width: 1,
    },
    weightInput: {
      flex: 1,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
      paddingHorizontal: 12,
      height: 42,
    },
    inputDone: {
      color: HOME_TONES.textSecondary,
    },
    unitBadge: {
      width: 54,
      height: 42,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderLeftWidth: 1,
      borderLeftColor: HOME_TONES.borderSoft,
    },
    unitText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
      textTransform: 'uppercase',
    },
    reps: {
      width: 76,
      height: 42,
      borderRadius: 14,
      backgroundColor: HOME_TONES.surface3,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      color: HOME_TONES.textPrimary,
      textAlign: 'center',
      paddingHorizontal: 12,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 20,
    },
    repsDone: {
      color: HOME_TONES.textSecondary,
    },
    checkboxBtn: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxBtnDone: {
      backgroundColor: colors.accentSoft,
    },
    checkboxBtnDisabled: {
      opacity: 0.55,
    },
    modeRow: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 14,
      marginTop: 8,
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    modeRowActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    modeText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    modeTextActive: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
  });
}
