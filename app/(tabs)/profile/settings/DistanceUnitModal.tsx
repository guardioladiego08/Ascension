// components/settings/DistanceUnitModal.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnits, DistanceUnit } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = { visible: boolean; onClose: () => void };

const DistanceUnitModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { distanceUnit, setDistanceUnit, distanceSaveState, distanceSaveError } = useUnits();
  const [localMsg, setLocalMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) setLocalMsg(null);
  }, [visible]);

  const saving = distanceSaveState === 'saving';

  const handleSelect = async (unit: DistanceUnit) => {
    setLocalMsg(null);
    const ok = await setDistanceUnit(unit);
    if (ok) {
      setLocalMsg('Saved');
      // Optional: close after a short confirmation window
      setTimeout(() => onClose(), 350);
    } else {
      setLocalMsg(null);
      // keep modal open so user sees error
    }
  };

  const Option = ({ unit, label }: { unit: DistanceUnit; label: string }) => {
    const isActive = distanceUnit === unit;
    return (
      <TouchableOpacity
        style={[styles.optionRow, isActive && styles.optionRowActive]}
        onPress={() => handleSelect(unit)}
        disabled={saving}
      >
        <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
          {label}
        </Text>
        {isActive && saving ? (
          <ActivityIndicator size="small" color={colors.text} />
        ) : isActive ? (
          <Ionicons name="checkmark" size={20} color={colors.text} />
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={saving ? undefined : onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>Distance unit</Text>
          <Text style={styles.subtitle}>
            Choose how distances are displayed for running and cycling.
          </Text>

          <View style={styles.options}>
            <Option unit="mi" label="Miles (mi)" />
            <Option unit="km" label="Kilometers (km)" />
          </View>

          {distanceSaveState === 'error' ? (
            <Text style={styles.errorText}>{distanceSaveError ?? 'Failed to save preference'}</Text>
          ) : localMsg ? (
            <Text style={styles.savedText}>{localMsg}</Text>
          ) : null}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            disabled={saving}
          >
            <Text style={styles.closeText}>{saving ? 'Saving…' : 'Close'}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default DistanceUnitModal;

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
      borderRadius: 16,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      marginTop: 4,
    },
    options: {
      marginTop: 12,
    },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 10,
      paddingHorizontal: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 8,
      backgroundColor: colors.card2,
    },
    optionRowActive: {
      borderColor: colors.highlight1,
      backgroundColor: colors.accentSoft,
    },
    optionText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    optionTextActive: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
    savedText: {
      marginTop: 8,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    errorText: {
      marginTop: 8,
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    closeButton: {
      marginTop: 8,
      alignSelf: 'flex-end',
      paddingVertical: 6,
      paddingHorizontal: 12,
      borderRadius: 999,
      backgroundColor: colors.card2,
    },
    closeText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
