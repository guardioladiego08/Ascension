import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import AuthScreen from '../components/AuthScreen';
import AppAlert from '../components/AppAlert';
import { withAlpha } from '@/constants/Colors';
import {
  useOnboardingDraftStore,
  type DbGender,
} from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';

type GenderUI = 'female' | 'male' | 'non_binary' | 'prefer_not';
type ActivePanel = 'dob' | 'height' | 'weight' | 'gender';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function UserInfo2() {
  const router = useRouter();
  const { draft, setDraft } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const initialDOB = useMemo(() => {
    if (draft.DOB) {
      const [year, month, day] = draft.DOB.split('-').map((value) => parseInt(value, 10));
      if (year && month && day) {
        return { year, monthIndex: month - 1, day };
      }
    }

    const now = new Date();
    return { year: now.getFullYear() - 25, monthIndex: 0, day: 1 };
  }, [draft.DOB]);

  const [year, setYear] = useState(initialDOB.year);
  const [monthIndex, setMonthIndex] = useState(initialDOB.monthIndex);
  const [day, setDay] = useState(initialDOB.day);
  const [heightCm, setHeightCm] = useState<number>(draft.height_cm ?? 175);
  const [weightKg, setWeightKg] = useState<number>(draft.weight_kg ?? 75);
  const [gender, setGender] = useState<GenderUI | null>((draft.gender as GenderUI) ?? null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('dob');

  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0.75);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [activePanel, fade]);

  const dobISO = useMemo(() => {
    const normalizedMonth = clamp(monthIndex, 0, 11);
    const normalizedYear = clamp(year, 1900, new Date().getFullYear());
    const maxDay = daysInMonth(normalizedYear, normalizedMonth);
    const normalizedDay = clamp(day, 1, maxDay);
    return `${normalizedYear}-${pad2(normalizedMonth + 1)}-${pad2(normalizedDay)}`;
  }, [day, monthIndex, year]);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertOnConfirm, setAlertOnConfirm] = useState<(() => void) | null>(null);

  const showAlert = (title: string, message: string, onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnConfirm(() => (onConfirm ? onConfirm : null));
    setAlertVisible(true);
  };

  const handleCloseAlert = () => {
    setAlertVisible(false);
    if (alertOnConfirm) {
      const cb = alertOnConfirm;
      setAlertOnConfirm(null);
      cb();
    }
  };

  const canContinue = useMemo(() => Boolean(gender), [gender]);

  const handleNext = () => {
    if (!gender) {
      showAlert('Missing info', 'Please select a gender option to continue.');
      setActivePanel('gender');
      return;
    }

    setDraft({
      DOB: dobISO,
      height_cm: heightCm,
      weight_kg: weightKg,
      gender: gender as DbGender,
    });

    router.replace('/SignInLogin/onboarding/UserInfo3');
  };

  const RailButton = ({
    title,
    value,
    icon,
    selected,
    onPress,
  }: {
    title: string;
    value: string;
    icon: keyof typeof Ionicons.glyphMap;
    selected: boolean;
    onPress: () => void;
  }) => (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onPress}
      style={[styles.railButton, selected ? styles.railButtonSelected : null]}
    >
      <View style={styles.railTopRow}>
        <Ionicons
          name={icon}
          size={18}
          color={selected ? colors.blkText : colors.textMuted}
        />
        <Text style={[styles.railTitle, selected ? styles.railTitleSelected : null]}>{title}</Text>
        <Text
          style={[styles.railValue, selected ? styles.railValueSelected : null]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const GenderButton = ({ value, label }: { value: GenderUI; label: string }) => {
    const selected = gender === value;
    return (
      <TouchableOpacity
        onPress={() => setGender(value)}
        activeOpacity={0.92}
        style={[styles.choiceButton, selected ? styles.choiceButtonSelected : null]}
      >
        <Text style={[styles.choiceButtonText, selected ? styles.choiceButtonTextSelected : null]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <AuthScreen
      eyebrow="Step 2 of 4"
      title="Body details"
      subtitle="These numbers drive onboarding defaults and the training analytics you see later."
      showBackButton
      backTo="/SignInLogin/onboarding/UserInfo1"
    >
      <View style={styles.rail}>
        <RailButton
          title="DOB"
          value={dobISO}
          icon="calendar-outline"
          selected={activePanel === 'dob'}
          onPress={() => setActivePanel('dob')}
        />
        <RailButton
          title="Height"
          value={`${Math.round(heightCm)} cm`}
          icon="resize-outline"
          selected={activePanel === 'height'}
          onPress={() => setActivePanel('height')}
        />
        <RailButton
          title="Weight"
          value={`${Math.round(weightKg)} kg`}
          icon="barbell-outline"
          selected={activePanel === 'weight'}
          onPress={() => setActivePanel('weight')}
        />
        <RailButton
          title="Gender"
          value={gender ? gender.replace('_', ' ') : 'Select'}
          icon="person-outline"
          selected={activePanel === 'gender'}
          onPress={() => setActivePanel('gender')}
        />
      </View>

      <Animated.View style={[styles.panel, { opacity: fade }]}>
        {activePanel === 'dob' ? (
          <View>
            <Text style={styles.panelTitle}>Date of birth</Text>
            <View style={styles.pickerRow}>
              <View style={styles.pickerWrap}>
                <Text style={styles.pickerLabel}>Month</Text>
                <Picker
                  selectedValue={monthIndex}
                  onValueChange={(value) => setMonthIndex(Number(value))}
                  style={styles.picker}
                  dropdownIconColor={colors.text}
                >
                  {MONTHS.map((month, currentMonthIndex) => (
                    <Picker.Item
                      key={month}
                      label={month}
                      value={currentMonthIndex}
                      color={colors.text}
                    />
                  ))}
                </Picker>
              </View>

              <View style={styles.pickerWrap}>
                <Text style={styles.pickerLabel}>Day</Text>
                <Picker
                  selectedValue={day}
                  onValueChange={(value) => setDay(Number(value))}
                  style={styles.picker}
                  dropdownIconColor={colors.text}
                >
                  {Array.from({ length: daysInMonth(year, monthIndex) }, (_, index) => index + 1).map(
                    (currentDay) => (
                      <Picker.Item
                        key={String(currentDay)}
                        label={String(currentDay)}
                        value={currentDay}
                        color={colors.text}
                      />
                    )
                  )}
                </Picker>
              </View>

              <View style={styles.pickerWrap}>
                <Text style={styles.pickerLabel}>Year</Text>
                <Picker
                  selectedValue={year}
                  onValueChange={(value) => setYear(Number(value))}
                  style={styles.picker}
                  dropdownIconColor={colors.text}
                >
                  {Array.from({ length: 90 }, (_, index) => new Date().getFullYear() - index).map(
                    (currentYear) => (
                      <Picker.Item
                        key={String(currentYear)}
                        label={String(currentYear)}
                        value={currentYear}
                        color={colors.text}
                      />
                    )
                  )}
                </Picker>
              </View>
            </View>
          </View>
        ) : null}

        {activePanel === 'height' ? (
          <View>
            <Text style={styles.panelTitle}>Height</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setHeightCm((value) => Math.max(90, value - 1))}
                activeOpacity={0.92}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{Math.round(heightCm)} cm</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setHeightCm((value) => Math.min(230, value + 1))}
                activeOpacity={0.92}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>Used for basic calculations and progress analytics.</Text>
          </View>
        ) : null}

        {activePanel === 'weight' ? (
          <View>
            <Text style={styles.panelTitle}>Weight</Text>
            <View style={styles.counterRow}>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setWeightKg((value) => Math.max(25, value - 1))}
                activeOpacity={0.92}
              >
                <Ionicons name="remove" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.counterValue}>{Math.round(weightKg)} kg</Text>
              <TouchableOpacity
                style={styles.counterButton}
                onPress={() => setWeightKg((value) => Math.min(250, value + 1))}
                activeOpacity={0.92}
              >
                <Ionicons name="add" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>You can update this later if it changes.</Text>
          </View>
        ) : null}

        {activePanel === 'gender' ? (
          <View>
            <Text style={styles.panelTitle}>Gender</Text>
            <View style={styles.choiceStack}>
              <GenderButton value="female" label="Female" />
              <GenderButton value="male" label="Male" />
              <GenderButton value="non_binary" label="Non-binary" />
              <GenderButton value="prefer_not" label="Prefer not to say" />
            </View>
            <Text style={styles.hint}>Used for optional personalization only.</Text>
          </View>
        ) : null}
      </Animated.View>

      <TouchableOpacity
        style={[styles.primaryButton, !canContinue ? styles.buttonDisabled : null]}
        activeOpacity={0.92}
        onPress={handleNext}
      >
        <Text style={styles.primaryButtonText}>Continue</Text>
        <Ionicons name="arrow-forward" size={18} color={colors.blkText} />
      </TouchableOpacity>

      <AppAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={handleCloseAlert}
      />
    </AuthScreen>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    rail: {
      gap: 10,
    },
    railButton: {
      borderRadius: 20,
      paddingVertical: 14,
      paddingHorizontal: 16,
      backgroundColor: withAlpha(colors.surface, 0.92),
      borderWidth: 1,
      borderColor: colors.border,
    },
    railButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    railTopRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    railTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    railTitleSelected: {
      color: colors.blkText,
    },
    railValue: {
      marginLeft: 'auto',
      maxWidth: 140,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textTransform: 'capitalize',
    },
    railValueSelected: {
      color: colors.blkText,
      fontFamily: fonts.heading,
    },
    panel: {
      marginTop: 14,
      minHeight: 240,
      borderRadius: 28,
      padding: 22,
      backgroundColor: withAlpha(colors.surface, 0.92),
      borderWidth: 1,
      borderColor: colors.border,
    },
    panelTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 20,
      lineHeight: 24,
      marginBottom: 12,
    },
    hint: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      marginTop: 14,
    },
    pickerRow: {
      flexDirection: 'row',
      gap: 10,
    },
    pickerWrap: {
      flex: 1,
      borderRadius: 18,
      padding: 8,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    pickerLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    picker: {
      color: colors.text,
    },
    counterRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 18,
    },
    counterButton: {
      width: 52,
      height: 52,
      borderRadius: 18,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.8,
    },
    choiceStack: {
      gap: 10,
      marginTop: 4,
    },
    choiceButton: {
      borderRadius: 18,
      paddingVertical: 16,
      paddingHorizontal: 16,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    choiceButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    choiceButtonText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    choiceButtonTextSelected: {
      color: colors.blkText,
    },
    primaryButton: {
      height: 54,
      borderRadius: 18,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 16,
    },
    buttonDisabled: {
      opacity: 0.62,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 20,
    },
  });
}
