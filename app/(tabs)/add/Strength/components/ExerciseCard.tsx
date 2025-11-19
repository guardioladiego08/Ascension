// app/(tabs)/add/Strength/components/ExerciseCard.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
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

  // ---------------------------------------------------------------------
  // SET MANIPULATION
  // ---------------------------------------------------------------------
  const [notesVisible, setNotesVisible] = useState(false);
  const [notesText, setNotesText] = useState('');

  const deleteSet = (tempId: string) => {
    const updated = exercise.sets.filter(s => s.tempId !== tempId);

    // Re-index cleanly
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

  // ---------------------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------------------

  let normalCounter = 0;

  return (
    <View style={styles.card}>
      {/* HEADER ROW */}
      <View style={styles.headerRow}>
        <Text style={styles.name}>{exercise.exercise_name}</Text>

        <TouchableOpacity
          style={styles.prefBtn}
          onPress={() => setOptionsVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={Colors.dark.text} />
        </TouchableOpacity>
      </View>

      {/* TABLE HEADER */}
      <View style={styles.tableHeader}>
        <Text style={[styles.th, { width: 32, textAlign: 'center' }]}>Set</Text>
        <Text style={[styles.th, { flex: 1, paddingLeft: 45 }]}>Weight</Text>
        <Text style={[styles.th, { width: 60, paddingRight: 15 }]}>Reps</Text>
      </View>

      {/* SET ROWS */}
      {exercise.sets.map(s => {
        let displayIndex: number | null = null;

        if (s.set_type === 'normal') {
          normalCounter += 1;
          displayIndex = normalCounter;
        }

        return (
          <Swipeable
            key={s.tempId}
            renderRightActions={() => (
              <View style={styles.deleteAction}>
                <TouchableOpacity onPress={() => deleteSet(s.tempId)}>
                  <Ionicons name="trash" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
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

      {/* ADD SET */}
      <TouchableOpacity style={styles.addSet} onPress={addSet}>
        <Ionicons name="add" size={16} color={Colors.dark.text} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>

      {/* OPTIONS MODAL */}
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
                    setOptionsVisible(false);
                    setNotesVisible(true);   // 👈 open notes editor modal
                  }}
                >
                  <Ionicons name="create-outline" size={16} color="#c3ceff" />
                  <Text style={styles.modalActionText}>Add Notes</Text>
                </TouchableOpacity>

              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      {/* NOTES MODAL */}
      <Modal
        visible={notesVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNotesVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setNotesVisible(false)}>
          <View style={styles.modalBackdrop}>
            <TouchableWithoutFeedback>
              <View style={styles.notesCard}>
                <Text style={styles.modalTitle}>Notes for {exercise.exercise_name}</Text>

                <View style={styles.textAreaWrap}>
                  <TextInput
                    multiline
                    numberOfLines={6}
                    style={styles.textArea}
                    placeholder="Write notes here..."
                    placeholderTextColor="#6b7390"
                    value={notesText}
                    onChangeText={setNotesText}
                  />
                </View>

                <View style={styles.notesButtons}>
                  <TouchableOpacity
                    style={styles.keepBtn}
                    onPress={() => setNotesVisible(false)}
                  >
                    <Text style={styles.notesSaveText}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.discardBtn}
                    onPress={() => {
                      // Save into EVERY set or a specific set?
                      const updatedSets = exercise.sets.map(s => ({
                        ...s,
                        notes: notesText,
                      }));
                      onChange({ ...exercise, sets: updatedSets });
                      setNotesVisible(false);
                    }}
                  >
                    <Text style={styles.notesSaveText}>Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

    </View>
  );
};

export default ExerciseCard;

// ---------------------------------------------------------------------
// STYLES
// ---------------------------------------------------------------------
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#202836ff',
    borderRadius: 16,
    padding: 12,
    marginHorizontal: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#2a3344',
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

  deleteAction: {
    backgroundColor: '#d9534f',
    justifyContent: 'center',
    alignItems: 'center',
    width: 70,
    borderRadius: 10,
    marginLeft: 10,
  },

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
    justifyContent: 'center',
    alignItems: 'center',
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
  // NOTES MODAL STYLES
notesCard: {
  width: '85%',
  backgroundColor: Colors.dark.card,
  borderRadius: 16,
  padding: 18,
  borderWidth: 1,
  borderColor: '#2a3557',
},

textAreaWrap: {
  backgroundColor: Colors.dark.background,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#2a3344',
  marginTop: 12,
  padding: 10,
},

textArea: {
  color: '#e7ecff',
  fontSize: 14,
  lineHeight: 20,
  minHeight: 120,
  textAlignVertical: 'top',
},

notesButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  gap: 12,
  marginTop: 20,
},

notesCancelBtn: {
  flex: 1,
  height: 44,
  borderRadius: 12,
  borderWidth: 1,
  borderColor: '#3b4668',
  justifyContent: 'center',
  alignItems: 'center',
},

notesCancelText: {
  color: '#e7ecff',
  fontSize: 15,
  fontWeight: '700',
},

notesSaveBtn: {
  flex: 1,
  height: 44,
  borderRadius: 12,
  backgroundColor: Colors.dark.highlight1,
  justifyContent: 'center',
  alignItems: 'center',
},

notesSaveText: {
  color: Colors.dark.text,
  fontSize: 15,
  fontWeight: '800',
},

});
