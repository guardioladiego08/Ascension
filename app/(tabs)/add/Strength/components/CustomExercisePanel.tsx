import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  createCustomExercise,
  findVisibleExerciseByName,
  getAuthenticatedUserId,
  type ExerciseRecord,
} from '@/lib/strength/exercises';
import { HOME_TONES } from '../../../home/tokens';

const BODY_PARTS = [
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
  'forearms',
  'full_body',
  'other',
];

const CATEGORIES = [
  'Dumbbell',
  'Barbell',
  'Machine',
  'Cable',
  'Bodyweight',
  'Kettlebell',
  'Band',
  'EZ-Bar',
  'Smith Machine',
  'Medicine Ball',
  'Trap Bar',
  'Cardio Equipment / Conditioning',
  'Suspension / TRX',
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess: (exercise: ExerciseRecord) => void;
};

const CustomExercisePanel: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [name, setName] = useState('');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const resetForm = () => {
    setName('');
    setBodyParts([]);
    setCategory('');
    setInfo('');
    setLoading(false);
    setCategoryPickerVisible(false);
  };

  useEffect(() => {
    if (!visible) {
      resetForm();
    }
  }, [visible]);

  const toggleBodyPart = (bodyPart: string) => {
    setBodyParts((prev) =>
      prev.includes(bodyPart)
        ? prev.filter((value) => value !== bodyPart)
        : [...prev, bodyPart]
    );
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Missing Name', 'Please enter an exercise name.');
      return;
    }

    if (bodyParts.length === 0) {
      Alert.alert('Missing Body Parts', 'Please select at least one body part.');
      return;
    }

    if (!category) {
      Alert.alert('Missing Category', 'Please select a workout category.');
      return;
    }

    setLoading(true);

    try {
      const userId = await getAuthenticatedUserId();
      if (!userId) {
        throw new Error('Not signed in.');
      }

      const existingExercise = await findVisibleExerciseByName(userId, trimmedName);
      if (existingExercise) {
        const alreadyShared = existingExercise.user_id == null;
        Alert.alert(
          'Exercise already exists',
          alreadyShared
            ? 'That exercise is already available in the shared library.'
            : 'You already have an exercise with this name. Try a different name or use the existing exercise in your list.'
        );
        return;
      }

      const createdExercise = await createCustomExercise({
        exercise_name: trimmedName,
        body_parts: bodyParts,
        workout_category: category || null,
        info: info.trim() || null,
        userId,
      });

      Alert.alert(
        'Exercise saved',
        `${createdExercise.exercise_name} has been added to your library.`
      );
      resetForm();
      onSuccess(createdExercise);
    } catch (error: any) {
      console.warn('Error inserting custom exercise', error);
      Alert.alert('Error', error?.message ?? 'Failed to add exercise.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={globalStyles.eyebrow}>Custom exercise</Text>
          <Text style={styles.title}>Add to your library</Text>
          <Text style={styles.subtitle}>
            Create the movement here, then return to the exercise list without losing your place.
          </Text>
        </View>

        <TouchableOpacity activeOpacity={0.92} style={styles.closeButton} onPress={handleClose}>
          <MaterialIcons name="close" size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={styles.formScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.label}>Exercise name</Text>
        <TextInput
          style={[globalStyles.textInput, styles.input]}
          placeholder="Enter name"
          placeholderTextColor={colors.textOffSt}
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Body parts</Text>
        <View style={styles.bodyPartWrap}>
          {BODY_PARTS.map((bodyPart) => {
            const active = bodyParts.includes(bodyPart);
            return (
              <TouchableOpacity
                key={bodyPart}
                activeOpacity={0.92}
                onPress={() => toggleBodyPart(bodyPart)}
                style={[styles.bpBtn, active ? styles.bpBtnSelected : null]}
              >
                <Text style={[styles.bpText, active ? styles.bpTextSelected : null]}>
                  {bodyPart}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={() => setCategoryPickerVisible(true)}
          style={styles.dropdownField}
        >
          <Text style={[styles.dropdownFieldText, !category ? styles.placeholderText : null]}>
            {category || 'Select category'}
          </Text>
          <MaterialIcons name="keyboard-arrow-down" size={22} color={colors.textMuted} />
        </TouchableOpacity>

        <Text style={styles.label}>Description / notes</Text>
        <TextInput
          style={[globalStyles.textInput, styles.textArea]}
          placeholder="Optional description..."
          placeholderTextColor={colors.textOffSt}
          multiline
          value={info}
          onChangeText={setInfo}
        />
      </ScrollView>

      <View style={styles.btnRow}>
        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleClose}
          style={[globalStyles.buttonSecondary, styles.button]}
        >
          <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          onPress={handleSubmit}
          style={[globalStyles.buttonPrimary, styles.button]}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.blkText} />
          ) : (
            <Text style={globalStyles.buttonTextPrimary}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      {categoryPickerVisible ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.overlayBackdrop}
            onPress={() => setCategoryPickerVisible(false)}
          />

          <View style={styles.overlayCard}>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayHeaderCopy}>
                <Text style={globalStyles.eyebrow}>Category</Text>
                <Text style={styles.overlayTitle}>Select category</Text>
              </View>

              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.overlayCloseButton}
                onPress={() => setCategoryPickerVisible(false)}
              >
                <MaterialIcons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={CATEGORIES}
              keyExtractor={(item) => item}
              style={styles.dropdownList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => {
                const active = category === item;
                return (
                  <TouchableOpacity
                    activeOpacity={0.92}
                    style={[styles.dropdownItem, active ? styles.dropdownSelected : null]}
                    onPress={() => {
                      setCategory(item);
                      setCategoryPickerVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.dropdownItemText,
                        active ? styles.dropdownItemTextSelected : null,
                      ]}
                    >
                      {item}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonSecondary, styles.dropdownCancelBtn]}
              onPress={() => setCategoryPickerVisible(false)}
            >
              <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </View>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    panel: {
      position: 'relative',
      minHeight: 0,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 18,
      gap: 0,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.6,
    },
    subtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
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
    formScroll: {
      maxHeight: 420,
      marginTop: 12,
    },
    formScrollContent: {
      paddingBottom: 12,
    },
    label: {
      marginTop: 12,
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    input: {
      marginTop: 8,
    },
    textArea: {
      marginTop: 8,
      minHeight: 90,
      textAlignVertical: 'top',
    },
    bodyPartWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginTop: 10,
    },
    bpBtn: {
      paddingVertical: 8,
      paddingHorizontal: 12,
      backgroundColor: colors.card2,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
    },
    bpBtnSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    bpText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'capitalize',
    },
    bpTextSelected: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
    dropdownField: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: 48,
      paddingHorizontal: 12,
      borderRadius: 16,
      backgroundColor: colors.textInput,
      borderWidth: 1,
      borderColor: colors.border,
      marginTop: 8,
    },
    dropdownFieldText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
      flex: 1,
      paddingRight: 10,
    },
    placeholderText: {
      color: colors.textOffSt,
    },
    btnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 18,
    },
    button: {
      flex: 1,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: 14,
    },
    overlayBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(6, 8, 10, 0.54)',
    },
    overlayCard: {
      maxHeight: '72%',
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 16,
      gap: 0,
    },
    overlayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    overlayHeaderCopy: {
      flex: 1,
    },
    overlayTitle: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.4,
    },
    overlayCloseButton: {
      width: 34,
      height: 34,
      borderRadius: 17,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dropdownList: {
      maxHeight: 280,
      marginTop: 18,
    },
    dropdownItem: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.card2,
      borderRadius: 14,
      marginVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    dropdownSelected: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    dropdownItemText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    dropdownItemTextSelected: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
    dropdownCancelBtn: {
      marginTop: 16,
    },
  });
}

export default CustomExercisePanel;
