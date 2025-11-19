// app/(tabs)/add/Strength/components/SetRow.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import type { SetDraft } from '../StrengthTrain';
import { Colors } from '@/constants/Colors';

// --- helpers -------------------------------------------------

const UnitToggle = ({
  value,
  onChange,
}: {
  value: 'kg' | 'lb';
  onChange: (u: 'kg' | 'lb') => void;
}) => (
  <TouchableOpacity
    style={styles.unitToggle}
    onPress={() => onChange(value === 'lb' ? 'kg' : 'lb')}
  >
    <Text style={styles.unitText}>{value}</Text>
  </TouchableOpacity>
);

const toKg = (weight: number, unit: 'kg' | 'lb') =>
  unit === 'kg' ? weight : weight * 0.45359237;

// Epley: 1RM_kg = weight_kg * (1 + reps/30)
const computeEst1RM = (
  weight: number | undefined,
  reps: number | undefined,
  unit: 'kg' | 'lb',
): number | null => {
  if (!weight || !reps || reps <= 0) return null;
  const wKg = toKg(weight, unit);
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

// --- component -----------------------------------------------

type Props = {
  setDraft: SetDraft;
  displayIndex: number | null; // UI-only index for normal sets
  onChange: (s: SetDraft) => void;
};

const SetRow: React.FC<Props> = ({ setDraft, displayIndex, onChange }) => {
  const [modeVisible, setModeVisible] = useState(false);

  const handleSelectMode = (mode: SetDraft['set_type']) => {
    onChange({ ...setDraft, set_type: mode });
    setModeVisible(false);
  };

  const letter = modeLetter[setDraft.set_type];
  const showNumber = setDraft.set_type === 'normal' && displayIndex != null;

  // when weight changes, recompute est_1rm if reps available
  const handleWeightChange = (text: string) => {
    const weight = text ? Number(text) : undefined;
    const reps = setDraft.reps ?? undefined;
    const est_1rm =
      weight && reps
        ? computeEst1RM(weight, reps, setDraft.weight_unit_csv)
        : null;

    onChange({
      ...setDraft,
      weight,
      est_1rm: est_1rm ?? undefined,
    });
  };

  // when reps change, recompute est_1rm if weight available
  const handleRepsChange = (text: string) => {
    const reps = text ? Number(text) : undefined;
    const weight = setDraft.weight ?? undefined;
    const est_1rm =
      weight && reps
        ? computeEst1RM(weight, reps, setDraft.weight_unit_csv)
        : null;

    onChange({
      ...setDraft,
      reps,
      est_1rm: est_1rm ?? undefined,
    });
  };

  // when unit toggles, recompute 1RM if we have both weight & reps
  const handleUnitToggle = (unit: 'kg' | 'lb') => {
    const weight = setDraft.weight ?? undefined;
    const reps = setDraft.reps ?? undefined;
    const est_1rm =
      weight && reps ? computeEst1RM(weight, reps, unit) : null;

    onChange({
      ...setDraft,
      weight_unit_csv: unit,
      est_1rm: est_1rm ?? undefined,
    });
  };

  return (
    <View style={styles.row}>
      {/* Set chip */}
      <TouchableOpacity
        style={[
          styles.idxBtn,
          setDraft.set_type !== 'normal' && styles.idxBtnActive,
        ]}
        onPress={() => setModeVisible(true)}
      >
        {showNumber ? (
          <Text style={styles.idxText}>{displayIndex}</Text>
        ) : (
          <Text style={styles.typeLetter}>{letter}</Text>
        )}
      </TouchableOpacity>

      {/* Weight */}
      <View style={styles.weightWrap}>
        <TextInput
          style={styles.weightInput}
          inputMode="decimal"
          placeholder="0"
          placeholderTextColor="#56607f"
          value={setDraft.weight?.toString() ?? ''}
          onChangeText={handleWeightChange}
        />
        <UnitToggle
          value={setDraft.weight_unit_csv}
          onChange={handleUnitToggle}
        />
      </View>

      {/* Reps */}
      <TextInput
        style={styles.reps}
        inputMode="numeric"
        placeholder="reps"
        placeholderTextColor={Colors.dark.textOffSt}
        value={setDraft.reps?.toString() ?? ''}
        onChangeText={handleRepsChange}
      />

      {/* Mode picker modal */}
      <Modal
        visible={modeVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModeVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModeVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>Set Type</Text>

                {(['normal', 'warmup', 'dropset', 'failure'] as SetDraft['set_type'][]).map(
                  m => (
                    <TouchableOpacity
                      key={m}
                      style={[
                        styles.modeRow,
                        m === setDraft.set_type && styles.modeRowActive,
                      ]}
                      onPress={() => handleSelectMode(m)}
                    >
                      <Text style={styles.modeText}>{modeLabel[m]}</Text>
                    </TouchableOpacity>
                  ),
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default SetRow;

// --- styles --------------------------------------------------

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 40,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },

  idxBtn: {
    width: 32,
    height: 40,

    alignItems: 'center',
    justifyContent: 'center',
  },
  idxBtnActive: {
    borderColor: '#f9b24e',
    backgroundColor: '#2b2233',
  },
  idxText: {
    color: Colors.dark.text,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  typeLetter: {
    color: '#f9b24e',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'center',
  },

  weightWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: .2,
    backgroundColor: Colors.dark.background,
    borderRadius: 10,
    overflow: 'hidden',
    width: 1
  },
  weightInput: {
    flex: 1,
    color: Colors.dark.text,
    paddingHorizontal: 10,
    height: 40,
    width: 100 
  },

  unitToggle: {
    width: 54,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.dark.card2,
  },
  unitText: { color: Colors.dark.text, fontWeight: '700' },

  reps: {
    width: 70,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2b3559',
    backgroundColor: Colors.dark.background,
    color: Colors.dark.text,
    textAlign: 'center',
    paddingRight: 10,
  },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '70%',
    backgroundColor: '#151b30',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,

  },
  modalTitle: {
    color: Colors.dark.text,
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 8,
  },
  modeRow: {
    paddingVertical: 8,
    borderRadius: 8,
    paddingHorizontal: 8,
    marginTop: 4,
  },
  modeRowActive: {
    backgroundColor: '#243162',
  },
  modeText: {
    color: '#d5dbff',
    fontSize: 14,
  },
});
