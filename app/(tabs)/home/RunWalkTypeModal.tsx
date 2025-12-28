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

export type RunWalkExerciseType =
  | 'outdoor_run'
  | 'outdoor_walk'
  | 'indoor_run'
  | 'indoor_walk';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: RunWalkExerciseType) => void;
};

export default function RunWalkTypeModal({ visible, onClose, onSelect }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card}>
          <Text style={styles.title}>Start Run/Walk</Text>
          <Text style={styles.subtitle}>Choose an activity type to begin.</Text>

          <View style={styles.list}>
            <OptionRow
              icon="walk-outline"
              label="Outdoor Run"
              onPress={() => onSelect('outdoor_run')}
            />
            <OptionRow
              icon="walk"
              label="Outdoor Walk"
              onPress={() => onSelect('outdoor_walk')}
            />
            <OptionRow
              icon="speedometer-outline"
              label="Indoor Run"
              onPress={() => onSelect('indoor_run')}
            />
            <OptionRow
              icon="analytics-outline"
              label="Indoor Walk"
              onPress={() => onSelect('indoor_walk')}
            />
          </View>

          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function OptionRow({
  icon,
  label,
  onPress,
}: {
  icon: any;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.9} style={styles.row} onPress={onPress}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={Colors.dark.text} />
      </View>
      <Text style={styles.rowText}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.dark.popUpCard,
    borderRadius: 16,
    paddingVertical: 22,
    paddingHorizontal: 20,
  },
  title: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  subtitle: {
    color: Colors.dark.text,
    fontSize: 14,
    marginBottom: 14,
    opacity: 0.9,
  },
  list: { gap: 10 },
  row: {
    backgroundColor: Colors.dark.card,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#0a0a0aff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  rowText: {
    flex: 1,
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  closeBtn: {
    marginTop: 14,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeText: { color: Colors.dark.text, fontSize: 14, fontWeight: '800' },
});
