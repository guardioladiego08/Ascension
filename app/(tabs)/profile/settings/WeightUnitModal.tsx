// components/settings/WeightUnitModal.tsx
import React, { useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUnits, WeightUnit } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const WeightUnitModal: React.FC<Props> = ({ visible, onClose }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { weightUnit, setWeightUnit } = useUnits();

  const handleSelect = async (unit: WeightUnit) => {
    await setWeightUnit(unit);
    onClose();
  };

  const Option = ({
    unit,
    label,
  }: {
    unit: WeightUnit;
    label: string;
  }) => {
    const isActive = weightUnit === unit;
    return (
      <TouchableOpacity
        style={[styles.optionRow, isActive && styles.optionRowActive]}
        onPress={() => handleSelect(unit)}
      >
        <Text
          style={[styles.optionText, isActive && styles.optionTextActive]}
        >
          {label}
        </Text>
        {isActive && (
          <Ionicons name="checkmark" size={20} color={colors.text} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>Weight unit</Text>
          <Text style={styles.subtitle}>
            Choose how weights and volume are displayed.
          </Text>

          <View style={styles.options}>
            <Option unit="lb" label="Pounds (lb)" />
            <Option unit="kg" label="Kilograms (kg)" />
          </View>

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

export default WeightUnitModal;

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
