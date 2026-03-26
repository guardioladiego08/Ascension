import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import ExercisePickerLibrary, {
  type ExercisePickerSelection,
} from './ExercisePickerLibrary';
import SupersetExerciseSelectionList from './SupersetExerciseSelectionList';

type Props = {
  visible: boolean;
  onClose: () => void;
  onCreate: (payload: {
    exercises: ExercisePickerSelection[];
  }) => void;
};

const SupersetBuilderModal: React.FC<Props> = ({ visible, onClose, onCreate }) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedExercises, setSelectedExercises] = useState<ExercisePickerSelection[]>([]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setSelectedExercises([]);
    setPickerOpen(false);
  }, [visible]);

  const removeExercise = (exerciseId: string) => {
    setSelectedExercises((current) =>
      current.filter((exercise) => exercise.id !== exerciseId)
    );
  };

  const handleCreate = () => {
    if (selectedExercises.length < 2) {
      Alert.alert('Need more exercises', 'A superset needs at least two exercises.');
      return;
    }

    onCreate({
      exercises: selectedExercises,
    });
  };

  return (
    <AppPopup
      visible={visible}
      onClose={() => {
        setPickerOpen(false);
        onClose();
      }}
      eyebrow="Structured block"
      title="Build a superset"
      subtitle="Choose at least two exercises, drag them into order, and the block will use your saved rest timer after each full round."
      showCloseButton
      contentStyle={styles.popupCard}
      bodyStyle={styles.popupBody}
    >
      <View style={styles.body}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionCopy}>
              <Text style={styles.sectionTitle}>Exercises</Text>
              <Text style={styles.sectionText}>
                Add the movements in sequence. Rest comes from Settings.
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonSecondary, styles.inlineButton]}
              onPress={() => setPickerOpen(true)}
            >
              <Ionicons name="add" size={16} color={colors.text} />
              <Text style={globalStyles.buttonTextSecondary}>Add exercise</Text>
            </TouchableOpacity>
          </View>

          {selectedExercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No exercises selected</Text>
              <Text style={styles.emptyText}>
                Add two or more exercises to create a superset block.
              </Text>
            </View>
          ) : (
            <SupersetExerciseSelectionList
              items={selectedExercises}
              onChange={setSelectedExercises}
              onRemove={removeExercise}
            />
          )}
        </View>

        <View style={styles.footerRow}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.buttonSecondary, styles.footerButton]}
            onPress={onClose}
          >
            <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.buttonPrimary, styles.footerButton]}
            onPress={handleCreate}
          >
            <Text style={globalStyles.buttonTextPrimary}>Create superset</Text>
          </TouchableOpacity>
        </View>

        {pickerOpen ? (
          <View style={styles.overlay} pointerEvents="box-none">
            <Pressable style={styles.overlayBackdrop} onPress={() => setPickerOpen(false)} />

            <View style={styles.overlayCard}>
              <View style={styles.overlayHeader}>
                <View style={styles.overlayHeaderCopy}>
                  <Text style={globalStyles.eyebrow}>Exercise library</Text>
                  <Text style={styles.overlayTitle}>Select exercise</Text>
                </View>

                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.closeButton}
                  onPress={() => setPickerOpen(false)}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>

              <ExercisePickerLibrary
                visible={pickerOpen}
                onClose={() => setPickerOpen(false)}
                onPick={(exercise) => {
                  if (
                    selectedExercises.some((item) => item.id === exercise.id)
                  ) {
                    Alert.alert(
                      'Already added',
                      'That exercise is already in this superset.'
                    );
                    return;
                  }

                  setSelectedExercises((current) => [...current, exercise]);
                  setPickerOpen(false);
                }}
                style={styles.overlayLibrary}
              />
            </View>
          </View>
        ) : null}
      </View>
    </AppPopup>
  );
};

export default SupersetBuilderModal;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    popupCard: {
      maxHeight: '88%',
      gap: 0,
      overflow: 'hidden',
    },
    popupBody: {
      minHeight: 0,
    },
    body: {
      position: 'relative',
      minHeight: 360,
      gap: 20,
    },
    section: {
      gap: 14,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    sectionCopy: {
      flex: 1,
      gap: 4,
    },
    sectionTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    sectionText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    inlineButton: {
      minWidth: 142,
    },
    emptyState: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 16,
      gap: 6,
    },
    emptyTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    emptyText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
    },
    footerRow: {
      flexDirection: 'row',
      gap: 12,
    },
    footerButton: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-start',
      paddingTop: 8,
    },
    overlayBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(6, 8, 10, 0.48)',
      borderRadius: 28,
    },
    overlayCard: {
      flex: 1,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.border,
      backgroundColor: HOME_TONES.surface1,
      padding: 18,
      gap: 0,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 18,
      shadowOffset: {
        width: 0,
        height: 10,
      },
      elevation: 14,
    },
    overlayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
      marginBottom: 12,
    },
    overlayHeaderCopy: {
      flex: 1,
    },
    overlayTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.6,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    overlayLibrary: {
      flex: 1,
      minHeight: 0,
    },
  });
}
