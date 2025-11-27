// components/settings/WeightUnitModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useUnits, WeightUnit } from '@/contexts/UnitsContext';

const BG = 'rgba(0,0,0,0.6)';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.textPrimary ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.primary ?? '#6366F1';

type Props = {
  visible: boolean;
  onClose: () => void;
};

const WeightUnitModal: React.FC<Props> = ({ visible, onClose }) => {
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
          <Ionicons name="checkmark" size={20} color={TEXT_PRIMARY} />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
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
    borderColor: BORDER,
    marginBottom: 8,
  },
  optionRowActive: {
    borderColor: ACCENT,
    backgroundColor: '#111827',
  },
  optionText: {
    color: TEXT_PRIMARY,
    fontSize: 14,
  },
  optionTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 8,
    alignSelf: 'flex-end',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: '#1F2937',
  },
  closeText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
});
