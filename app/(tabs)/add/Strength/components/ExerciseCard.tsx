import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { v4 as uuidv4 } from 'uuid';
import { Swipeable } from 'react-native-gesture-handler';

import type { ExerciseDraft, SetDraft } from '@/lib/strength/types';
import type { StrengthRestTimerState } from '@/lib/strength/restTimer';
import { useUnits } from '@/contexts/UnitsContext';
import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';
import { HOME_TONES } from '../../../home/tokens';

import ExerciseRestTimerBar from './ExerciseRestTimerBar';
import SetRow from './SetRow';

type Props = {
  exercise: ExerciseDraft;
  restTimer: StrengthRestTimerState;
  onDelete: () => void;
  onChange: (updated: ExerciseDraft) => void;
  onSetCompleted: (exerciseInstanceId: string) => void;
};

const ExerciseCard: React.FC<Props> = ({
  exercise,
  restTimer,
  onDelete,
  onChange,
  onSetCompleted,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [notesText, setNotesText] = useState(exercise.sets[0]?.notes ?? '');
  const { weightUnit } = useUnits();

  const deleteSet = (tempId: string) => {
    const updated = exercise.sets.filter((setDraft) => setDraft.tempId !== tempId);
    const reindexed = updated.map((setDraft, idx) => ({
      ...setDraft,
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
          weight_unit_csv: weightUnit,
          weight: undefined,
          reps: undefined,
          rpe: undefined,
          est_1rm: undefined,
          done: false,
        },
      ],
    });
  };

  const updateSet = (tempId: string, updater: (setDraft: SetDraft) => SetDraft) => {
    onChange({
      ...exercise,
      sets: exercise.sets.map((setDraft) =>
        setDraft.tempId === tempId ? updater(setDraft) : setDraft
      ),
    });
  };

  let normalCounter = 0;

  return (
    <View style={[styles.panelSoft, styles.card]}>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.name}>{exercise.exercise_name}</Text>
          <Text style={styles.meta}>
            {exercise.sets.length} set{exercise.sets.length === 1 ? '' : 's'} logged
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.prefBtn}
          onPress={() => setOptionsVisible(true)}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.tableHeader}>
        <Text style={[styles.th, styles.thSet]}>Set</Text>
        <Text style={[styles.th, styles.thWeight]}>Weight</Text>
        <Text style={[styles.th, styles.thReps]}>Reps</Text>
        <Text style={[styles.th, styles.thDone]}>Done</Text>
      </View>

      {exercise.sets.map((setDraft) => {
        let displayIndex: number | null = null;

        if (setDraft.set_type === 'normal') {
          normalCounter += 1;
          displayIndex = normalCounter;
        }

        return (
          <Swipeable
            key={setDraft.tempId}
            renderRightActions={() => (
              <View style={styles.deleteAction}>
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.deleteActionButton}
                  onPress={() => deleteSet(setDraft.tempId)}
                >
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          >
            <SetRow
              setDraft={setDraft}
              displayIndex={displayIndex}
              suggestedSet={exercise.previousSessionSets?.[setDraft.set_index - 1]}
              onChange={(next) => updateSet(setDraft.tempId, () => next)}
              onToggleComplete={(nextDone) => {
                updateSet(setDraft.tempId, (current) => ({
                  ...current,
                  done: nextDone,
                }));
                if (nextDone) {
                  onSetCompleted(exercise.instanceId);
                }
              }}
            />
          </Swipeable>
        );
      })}

      <TouchableOpacity activeOpacity={0.92} style={styles.addSet} onPress={addSet}>
        <Ionicons name="add" size={16} color={colors.highlight1} />
        <Text style={styles.addSetText}>Add set</Text>
      </TouchableOpacity>

      <ExerciseRestTimerBar
        timer={restTimer}
        exerciseInstanceId={exercise.instanceId}
      />

      <AppPopup
        visible={optionsVisible}
        onClose={() => setOptionsVisible(false)}
        eyebrow="Exercise actions"
        title={exercise.exercise_name}
      >
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.modalAction}
          onPress={() => {
            setOptionsVisible(false);
            onDelete();
          }}
        >
          <View style={[styles.actionIconWrap, styles.actionIconDanger]}>
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
          </View>
          <Text style={styles.modalActionText}>Remove from workout</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.modalAction}
          onPress={() => {
            setNotesText(exercise.sets[0]?.notes ?? notesText);
            setOptionsVisible(false);
            setNotesVisible(true);
          }}
        >
          <View style={[styles.actionIconWrap, styles.actionIconAccent]}>
            <Ionicons name="create-outline" size={16} color={colors.highlight1} />
          </View>
          <Text style={styles.modalActionText}>Add notes</Text>
        </TouchableOpacity>
      </AppPopup>

      <AppPopup
        visible={notesVisible}
        onClose={() => setNotesVisible(false)}
        eyebrow="Exercise notes"
        title={`Notes for ${exercise.exercise_name}`}
        animationType="slide"
      >
        <View style={styles.textAreaWrap}>
          <TextInput
            multiline
            numberOfLines={6}
            style={styles.textArea}
            placeholder="Write notes here..."
            placeholderTextColor={HOME_TONES.textTertiary}
            value={notesText}
            onChangeText={setNotesText}
          />
        </View>

        <View style={styles.notesButtons}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.buttonSecondary, styles.noteButton]}
            onPress={() => setNotesVisible(false)}
          >
            <Text style={styles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[styles.buttonPrimary, styles.noteButton]}
            onPress={() => {
              const updatedSets = exercise.sets.map((setDraft) => ({
                ...setDraft,
                notes: notesText,
              }));
              onChange({ ...exercise, sets: updatedSets });
              setNotesVisible(false);
            }}
          >
            <Text style={styles.buttonTextPrimary}>Save</Text>
          </TouchableOpacity>
        </View>
      </AppPopup>
    </View>
  );
};

export default ExerciseCard;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
    },
    buttonPrimary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
      flexDirection: 'row',
    },
    buttonSecondary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      flexDirection: 'row',
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    card: {
      marginTop: 14,
      padding: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 10,
    },
    headerCopy: {
      flex: 1,
    },
    name: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    meta: {
      marginTop: 4,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    prefBtn: {
      width: 36,
      height: 36,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tableHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 2,
      marginBottom: 4,
    },
    th: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    thSet: {
      width: 38,
      textAlign: 'center',
    },
    thWeight: {
      flex: 1,
      paddingLeft: 14,
    },
    thReps: {
      width: 76,
      textAlign: 'center',
    },
    thDone: {
      width: 34,
      textAlign: 'center',
    },
    deleteAction: {
      justifyContent: 'center',
      alignItems: 'center',
      width: 72,
      marginLeft: 10,
    },
    deleteActionButton: {
      width: 42,
      height: 42,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    addSet: {
      marginTop: 12,
      minHeight: 42,
      borderRadius: 14,
      borderStyle: 'dashed',
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 8,
    },
    addSetText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    modalAction: {
      marginTop: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingVertical: 12,
      paddingHorizontal: 12,
    },
    actionIconWrap: {
      width: 34,
      height: 34,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionIconDanger: {
      backgroundColor: colors.accentSecondarySoft,
    },
    actionIconAccent: {
      backgroundColor: colors.accentSoft,
    },
    modalActionText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    textAreaWrap: {
      marginTop: 18,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface3,
      padding: 12,
    },
    textArea: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    notesButtons: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    noteButton: {
      flex: 1,
    },
  });
}
