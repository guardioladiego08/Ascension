// app/(tabs)/add/Strength/components/ExerciseCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';

import type { ExerciseDraft, SetDraft } from '../StrengthTrain';
import SetRow from './SetRow';
import { Colors } from '@/constants/Colors';
import { Swipeable } from 'react-native-gesture-handler';


type Props = {
  exercise: ExerciseDraft;
  onDelete: () => void;
  onChange: (updated: ExerciseDraft) => void;
};

const ExerciseCard: React.FC<Props> = ({ exercise, onDelete, onChange }) => {
  const [optionsVisible, setOptionsVisible] = useState(false);

  const deleteSet = (tempId: string) => {
    const updated = exercise.sets.filter(s => s.tempId !== tempId);

    // Re-index set_index for correct backend sequence
    const reindexed = updated.map((s, idx) => ({
      ...s,
      set_index: idx + 1,
    }));

    onChange({
      ...exercise,
      sets: reindexed,
    });
  };


  const addSet = () => {
    const nextIndex = exercise.sets.length + 1;
    onChange({
      ...exercise,
      sets: [
        ...exercise.sets,
        {
          tempId: uuidv4(),
          set_index: nextIndex,
          set_type: 'normal',
          weight_unit_csv: exercise.sets.at(-1)?.weight_unit_csv ?? 'lb',
          weight: undefined,
          reps: undefined,
          rpe: undefined,
          est_1rm: undefined,
          done: false,
        },
      ],
    });
  };

  const updateSet = (tempId: string, updater: (s: SetDraft) => SetDraft) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map(s => (s.tempId === tempId ? updater(s) : s)),
    });
  };

  // compute displayIndex (only for normal sets; others show letters)
  let normalCounter = 0;

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.name}>{exercise.exercise_name}</Text>
        <TouchableOpacity style={styles.prefBtn} onPress={() => setOptionsVisible(true)}>
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: 32, textAlign: 'center' }]}>Set</Text>
        <Text style={[styles.th, { flex: 1, paddingLeft:45 }]}>Weight</Text>
        <Text style={[styles.th, { width: 60, paddingRight:15}]}>reps</Text>
      </View>

      let normalCounter = 0;

      {exercise.sets.map((s) => {
        // determine the display index for SetRow:
        let displayIndex: number | null = null;

        if (s.set_type === "normal") {
          normalCounter += 1;
          displayIndex = normalCounter;
        }

        return (
          <Swipeable
            key={s.tempId}
            renderRightActions={() => (
              <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => deleteSet(s.tempId)}
              >
                <Ionicons name="trash" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          >
            <SetRow
              setDraft={s}
              displayIndex={displayIndex}
              onChange={next => updateSet(s.tempId, () => next)}
            />
          </Swipeable>
        );
      })}

      <TouchableOpacity style={styles.addSet} onPress={addSet}>
        <Ionicons name="add" size={16} color={Colors.dark.text} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>

      {/* Preferences popup */}
      <Modal
        visible={optionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setOptionsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setOptionsVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.modalCard}>
                <Text style={styles.modalTitle}>{exercise.exercise_name}</Text>

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => {
                    setOptionsVisible(false);
                    onDelete();
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color="#ff9b9b" />
                  <Text style={styles.modalActionText}>Remove from workout</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalAction}
                  onPress={() => {
                    // Future: duplicate, presets, etc.
                    setOptionsVisible(false);
                  }}
                >
                  <Ionicons name="copy-outline" size={16} color="#c3ceff" />
                  <Text style={styles.modalActionText}>Duplicate (coming soon)</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

export default ExerciseCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#202836ff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: { color: '#f0f3ff', fontWeight: '700', fontSize: 16 },
  prefBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: Colors.dark.background,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  th: { color: Colors.dark.text, fontSize: 12, letterSpacing: 1 },
  addSet: {
    height: 40,
    borderRadius: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.dark.text,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  addSetText: { color: Colors.dark.text, fontWeight: '700' },

  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '80%',
    backgroundColor: '#151b30',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2a3557',
  },
  modalTitle: {
    color: '#e7ecff',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  modalAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  modalActionText: {
    color: '#d5dbff',
    fontSize: 14,
  },
  deleteAction: {
    backgroundColor: '#d9534f',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    marginLeft: 10,
    borderRadius: 10,
  }

});
