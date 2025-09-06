// components/my components/strength/ExerciseCard.tsx
// -----------------------------------------------------------------------------
// A single exercise card showing:
// - Title + delete
// - Column header (Set/Weight/Reps/Mode)
// - Rows for each set with numeric inputs and a tappable "SET" cell to change mode
// - Add Set button
//
// New: Tap the set number to choose a mode: Normal (default, keeps counting),
// Warm-up, Drop Set, or Failure. If you back out without choosing, it remains as-is.
// -----------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import type { ExerciseType, SetMode } from './types';

type Props = {
  ex: ExerciseType;
  index: number;
  onDelete: (exerciseId: string) => void;
  onAddSet: (exerciseId: string) => void;
  onUpdateSet: (exId: string, idx: number, field: 'weight' | 'reps', val: string) => void;

  /** NEW — called when user changes the mode for a set */
  onUpdateSetMode?: (exId: string, idx: number, mode: SetMode) => void;
};

const MODE_LABEL: Record<SetMode, string> = {
  normal: 'Normal',
  warmup: 'Warm-up',
  dropset: 'Drop Set',
  failure: 'Failure',
};

const MODE_BADGE_STYLE: Record<
  SetMode,
  { bg: string; fg: string; border?: string }
> = {
  normal: { bg: '#3A3A3A', fg: '#BEBEBE', border: '#4A4A4A' },
  warmup: { bg: '#2b3a22', fg: '#a7e27b', border: '#3d5a30' },
  dropset: { bg: '#3a2622', fg: '#ffb39d', border: '#5a3a33' },
  failure: { bg: '#3a2222', fg: '#ff8a8a', border: '#5a3333' },
};

const ExerciseCard: React.FC<Props> = ({
  ex,
  index,
  onDelete,
  onAddSet,
  onUpdateSet,
  onUpdateSetMode,
}) => {
  const [modePicker, setModePicker] = useState<{ open: boolean; setIndex: number | null }>({
    open: false,
    setIndex: null,
  });

  // Defensive no-op to avoid "onUpdateSetMode is not a function"
  const updateMode = useMemo(
    () => onUpdateSetMode ?? ((/*exId, idx, mode*/) => {}),
    [onUpdateSetMode]
  );

  const openModePicker = (setIdx: number) => {
    setModePicker({ open: true, setIndex: setIdx });
  };

  const closeModePicker = () => {
    setModePicker({ open: false, setIndex: null });
  };

  const chooseMode = (mode: SetMode) => {
    if (modePicker.setIndex == null) return;
    updateMode(ex.id, modePicker.setIndex, mode);
    closeModePicker();
  };

  return (
    <View style={styles.section}>
      {/* Header: Title + trash */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {index + 1}. {ex.name}
        </Text>

        <TouchableOpacity onPress={() => onDelete(ex.id)} accessibilityLabel="Remove exercise">
          <MaterialIcons name="delete" size={20} color="#c00808ff" />
        </TouchableOpacity>
      </View>

      {/* Column header */}
      <View style={styles.headerRow}>
        <Text style={[styles.headerCell, { flex: 1 }]}>SET</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>WEIGHT</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>REPS</Text>
        <Text style={[styles.headerCell, { flex: 1.2 }]}>MODE</Text>
      </View>

      {/* Set rows */}
      {ex.sets.map((st, i) => {
        const badge = MODE_BADGE_STYLE[st.mode ?? 'normal'];
        return (
          <View key={`${ex.id}-${i}`} style={styles.dataRow}>
            {/* Tappable SET cell to edit mode */}
            <TouchableOpacity style={styles.setCell} onPress={() => openModePicker(i)}>
              <Text style={styles.setNum}>{i + 1}</Text>
            </TouchableOpacity>

            {/* Weight */}
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#888"
              value={st.weight}
              onChangeText={(v) => onUpdateSet(ex.id, i, 'weight', v)}
            />

            {/* Reps */}
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor="#888"
              value={st.reps}
              onChangeText={(v) => onUpdateSet(ex.id, i, 'reps', v)}
            />

            {/* Mode badge – reflects current mode, default "Normal" keeps counting */}
            <TouchableOpacity style={[styles.modePill, { backgroundColor: badge.bg, borderColor: badge.border ?? 'transparent' }]} onPress={() => openModePicker(i)}>
              <MaterialIcons
                name={st.mode === 'warmup' ? 'local-fire-department' : st.mode === 'dropset' ? 'south' : st.mode === 'failure' ? 'warning-amber' : 'timer'}
                size={14}
                color={badge.fg}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.modeText, { color: badge.fg }]}>{MODE_LABEL[st.mode ?? 'normal']}</Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {/* Add set */}
      <TouchableOpacity style={styles.addSetBtn} onPress={() => onAddSet(ex.id)}>
        <MaterialIcons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>


      {/* Mode Picker Modal (lightweight, no extra deps) */}
      <Modal animationType="fade" transparent visible={modePicker.open} onRequestClose={closeModePicker}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Set Mode</Text>

            <ModeOption
              icon="timer"
              label="Normal (default)"
              desc="Standard set; continues counting."
              active={false}
              onPress={() => chooseMode('normal')}
            />
            <ModeOption
              icon="local-fire-department"
              label="Warm-up"
              desc="Prep set; lighter weight."
              active={false}
              onPress={() => chooseMode('warmup')}
            />
            <ModeOption
              icon="south"
              label="Drop Set"
              desc="Reduce weight and keep going."
              active={false}
              onPress={() => chooseMode('dropset')}
            />
            <ModeOption
              icon="warning-amber"
              label="Failure"
              desc="AMRAP to technical failure."
              active={false}
              onPress={() => chooseMode('failure')}
            />

            <TouchableOpacity style={styles.modalCancel} onPress={closeModePicker}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const LegendDot: React.FC<{ color: string; label: string }> = ({ color, label }) => {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
};

const ModeOption: React.FC<{
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  desc: string;
  active: boolean;
  onPress: () => void;
}> = ({ icon, label, desc, active, onPress }) => {
  return (
    <TouchableOpacity style={[styles.modeRow, active && { backgroundColor: '#2f2f2f' }]} onPress={onPress}>
      <MaterialIcons name={icon} size={18} color="#ddd" style={{ marginRight: 10 }} />
      <View style={{ flex: 1 }}>
        <Text style={styles.modeRowLabel}>{label}</Text>
        <Text style={styles.modeRowDesc}>{desc}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default ExerciseCard;

const styles = StyleSheet.create({
  section: {
    backgroundColor: '#2A2A2A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#666',
    paddingBottom: 6,
  },
  headerCell: {
    textAlign: 'center',
    color: '#AAA',
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    alignItems: 'center',
  },
  setCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  setNum: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
  input: {
    flex: 1,
    borderBottomWidth: 1,
    borderColor: '#888',
    color: 'white',
    textAlign: 'center',
    paddingVertical: 2,
    marginHorizontal: 4,
  },
  modePill: {
    flex: 1.2,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  modeText: {
    fontSize: 12,
    marginRight: 4,
  },
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  addSetText: {
    color: 'white',
    marginLeft: 6,
    fontSize: 14,
  },

  // --- Modal styles ---
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#1F1F1F',
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  modalTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2c2c2c',
  },
  modeRowLabel: {
    color: '#eaeaea',
    fontSize: 14,
    fontWeight: '600',
  },
  modeRowDesc: {
    color: '#9a9a9a',
    fontSize: 12,
    marginTop: 2,
  },
  modalCancel: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalCancelText: {
    color: '#bbb',
    fontSize: 14,
  },
});
