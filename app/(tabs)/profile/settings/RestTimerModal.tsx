import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  MAX_STRENGTH_REST_TIMER_SECONDS,
  MIN_STRENGTH_REST_TIMER_SECONDS,
  STRENGTH_REST_TIMER_PRESET_SECONDS,
  STRENGTH_REST_TIMER_STEP_SECONDS,
} from '@/lib/strength/restTimerPreferences';
import { formatRestTimerClock } from '@/lib/strength/restTimer';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  visible: boolean;
  valueSeconds: number;
  onClose: () => void;
  onSave: (seconds: number) => void | Promise<void>;
};

const RestTimerModal: React.FC<Props> = ({
  visible,
  valueSeconds,
  onClose,
  onSave,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [draftSeconds, setDraftSeconds] = useState(valueSeconds);

  useEffect(() => {
    if (!visible) return;
    setDraftSeconds(valueSeconds);
  }, [valueSeconds, visible]);

  const updateDraft = (nextSeconds: number) => {
    const bounded = Math.min(
      MAX_STRENGTH_REST_TIMER_SECONDS,
      Math.max(MIN_STRENGTH_REST_TIMER_SECONDS, nextSeconds)
    );
    setDraftSeconds(bounded);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(event) => event.stopPropagation()}>
          <Text style={styles.title}>Rest timer</Text>
          <Text style={styles.subtitle}>
            Set the default countdown used during strength workouts. This stays on-device only.
          </Text>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Default duration</Text>
            <Text style={styles.previewValue}>{formatRestTimerClock(draftSeconds)}</Text>
          </View>

          <View style={styles.stepperRow}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.stepperButton}
              onPress={() => updateDraft(draftSeconds - STRENGTH_REST_TIMER_STEP_SECONDS)}
            >
              <Ionicons name="remove" size={18} color={colors.text} />
            </TouchableOpacity>

            <Text style={styles.stepperValue}>
              {Math.floor(draftSeconds / 60)} min {draftSeconds % 60} sec
            </Text>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.stepperButton}
              onPress={() => updateDraft(draftSeconds + STRENGTH_REST_TIMER_STEP_SECONDS)}
            >
              <Ionicons name="add" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          <View style={styles.presetWrap}>
            {STRENGTH_REST_TIMER_PRESET_SECONDS.map((seconds) => {
              const active = seconds === draftSeconds;
              return (
                <TouchableOpacity
                  key={seconds}
                  activeOpacity={0.92}
                  style={[styles.presetChip, active ? styles.presetChipActive : null]}
                  onPress={() => updateDraft(seconds)}
                >
                  <Text style={[styles.presetText, active ? styles.presetTextActive : null]}>
                    {formatRestTimerClock(seconds)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.secondaryButton}
              onPress={onClose}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.primaryButton}
              onPress={() => onSave(draftSeconds)}
            >
              <Text style={styles.primaryText}>Save</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default RestTimerModal;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.62)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    card: {
      width: '100%',
      borderRadius: 18,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 21,
    },
    subtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    previewCard: {
      marginTop: 16,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingVertical: 16,
      alignItems: 'center',
      gap: 4,
    },
    previewLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    previewValue: {
      color: colors.text,
      fontFamily: fonts.mono,
      fontSize: 28,
      lineHeight: 32,
      fontVariant: ['tabular-nums'],
    },
    stepperRow: {
      marginTop: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    stepperButton: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    stepperValue: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
      textAlign: 'center',
    },
    presetWrap: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    presetChip: {
      minWidth: 78,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
    },
    presetChipActive: {
      borderColor: colors.highlight1,
      backgroundColor: colors.accentSoft,
    },
    presetText: {
      color: colors.textMuted,
      fontFamily: fonts.mono,
      fontSize: 13,
      lineHeight: 16,
      fontVariant: ['tabular-nums'],
    },
    presetTextActive: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
    actions: {
      marginTop: 18,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 10,
    },
    secondaryButton: {
      minHeight: 42,
      borderRadius: 14,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    secondaryText: {
      color: colors.textMuted,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
    primaryButton: {
      minHeight: 42,
      borderRadius: 14,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
    },
    primaryText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 16,
    },
  });
}
