import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from 'react-native';

import type { SetDraft } from '@/lib/strength/types';
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
  onChange: (s: SetDraft) => void;
};

const SetRow: React.FC<Props> = ({ setDraft, displayIndex, onChange }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [modeVisible, setModeVisible] = useState(false);
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

  const handleWeightChange = (text: string) => {
    const wDisplay = text ? Number(text) : undefined;
    let newStoredWeight: number | undefined;

    if (wDisplay != null && !Number.isNaN(wDisplay)) {
      newStoredWeight = convertBetweenUnits(wDisplay, viewerUnit, storedUnit);
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
    const reps = text ? Number(text) : undefined;
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
          style={styles.weightInput}
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor={HOME_TONES.textTertiary}
          value={
            displayWeight != null && !Number.isNaN(displayWeight)
              ? String(displayWeight)
              : ''
          }
          onChangeText={handleWeightChange}
        />
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>{viewerUnit}</Text>
        </View>
      </View>

      <TextInput
        style={styles.reps}
        inputMode="numeric"
        placeholder="reps"
        placeholderTextColor={HOME_TONES.textTertiary}
        value={setDraft.reps?.toString() ?? ''}
        onChangeText={handleRepsChange}
      />

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
