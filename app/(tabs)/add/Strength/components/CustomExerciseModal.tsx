import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';
import {
  createCustomExercise,
  findVisibleExerciseByName,
  getAuthenticatedUserId,
} from '@/lib/strength/exercises';

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
  onSuccess: () => void;
};

const CustomExerciseModal: React.FC<Props> = ({ visible, onClose, onSuccess }) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [name, setName] = useState('');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const [categoryDropdownVisible, setCategoryDropdownVisible] = useState(false);

  const toggleBodyPart = (bodyPart: string) => {
    setBodyParts((prev) =>
      prev.includes(bodyPart)
        ? prev.filter((value) => value !== bodyPart)
        : [...prev, bodyPart]
    );
  };

  const resetForm = () => {
    setName('');
    setBodyParts([]);
    setCategory('');
    setInfo('');
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
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

      const existingExercise = await findVisibleExerciseByName(userId, name);
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

      await createCustomExercise({
        exercise_name: name.trim(),
        body_parts: bodyParts,
        workout_category: category || null,
        info: info.trim() || null,
        userId,
      });

      Alert.alert('Success', 'Exercise added successfully!');
      resetForm();
      onSuccess();
    } catch (err: any) {
      console.warn('Error inserting custom exercise', err);
      Alert.alert('Error', err?.message ?? 'Failed to add exercise.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppPopup
        visible={visible}
        onClose={onClose}
        eyebrow="Custom exercise"
        title="Add to your library"
        showCloseButton
        contentStyle={styles.modalBox}
      >
        <ScrollView style={styles.formScroll} showsVerticalScrollIndicator={false}>
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
            onPress={() => setCategoryDropdownVisible(true)}
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
            onPress={onClose}
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
      </AppPopup>

      <AppPopup
        visible={categoryDropdownVisible}
        onClose={() => setCategoryDropdownVisible(false)}
        eyebrow="Category"
        title="Select category"
        align="bottom"
        contentStyle={styles.dropdownBox}
      >
        <FlatList
          data={CATEGORIES}
          keyExtractor={(item) => item}
          style={styles.dropdownList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = category === item;
            return (
              <TouchableOpacity
                activeOpacity={0.92}
                style={[styles.dropdownItem, active ? styles.dropdownSelected : null]}
                onPress={() => {
                  setCategory(item);
                  setCategoryDropdownVisible(false);
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
          onPress={() => setCategoryDropdownVisible(false)}
        >
          <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
        </TouchableOpacity>
      </AppPopup>
    </>
  );
};

export default CustomExerciseModal;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    modalBox: {
      gap: 0,
    },
    formScroll: {
      maxHeight: '72%',
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
    dropdownBox: {
      width: '100%',
      maxHeight: '72%',
      gap: 0,
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
