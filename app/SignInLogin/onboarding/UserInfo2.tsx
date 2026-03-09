import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import AuthScreen from '../components/AuthScreen';
import AppAlert from '../components/AppAlert';
import { withAlpha } from '@/constants/Colors';
import {
  useOnboardingDraftStore,
  type DbGender,
} from '@/lib/onboarding/onboardingDraftStore';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { useUnits } from '@/contexts/UnitsContext';

type GenderUI = 'female' | 'male' | 'non_binary' | 'prefer_not';
type ActivePanel = 'dob' | 'height' | 'weight' | 'gender';

const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
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

const MIN_HEIGHT_CM = 90;
const MAX_HEIGHT_CM = 230;
const MIN_WEIGHT_KG = 25;
const MAX_WEIGHT_KG = 250;
const CM_PER_INCH = 2.54;
const KG_PER_LB = 0.45359237;

function digitsOnly(value: string) {
  return value.replace(/[^\d]/g, '');
}

function cmToFeetInches(cm: number) {
  const totalInches = Math.round(clamp(cm, MIN_HEIGHT_CM, MAX_HEIGHT_CM) / CM_PER_INCH);
  return {
    feet: Math.floor(totalInches / 12),
    inches: totalInches % 12,
  };
}

function feetInchesToCm(feet: number, inches: number) {
  return Math.round((feet * 12 + inches) * CM_PER_INCH);
}

function kgToLb(kg: number) {
  return Math.round(clamp(kg, MIN_WEIGHT_KG, MAX_WEIGHT_KG) / KG_PER_LB);
}

function lbToKg(lb: number) {
  return Math.round(lb * KG_PER_LB);
}

export default function UserInfo2() {
  const router = useRouter();
  const { draft, setDraft } = useOnboardingDraftStore();
  const { colors, fonts } = useAppTheme();
  const { weightUnit, distanceUnit } = useUnits();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const usesImperial = weightUnit === 'lb' || distanceUnit === 'mi';

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
  const [yearInput, setYearInput] = useState(String(initialDOB.year));
  const [dayInput, setDayInput] = useState(String(initialDOB.day));
  const initialHeightCm = draft.height_cm ?? 175;
  const initialWeightKg = draft.weight_kg ?? 75;
  const initialHeightImperial = cmToFeetInches(initialHeightCm);

  const [heightCm, setHeightCm] = useState<number>(initialHeightCm);
  const [weightKg, setWeightKg] = useState<number>(initialWeightKg);
  const [heightCmInput, setHeightCmInput] = useState(String(Math.round(initialHeightCm)));
  const [heightFeetInput, setHeightFeetInput] = useState(String(initialHeightImperial.feet));
  const [heightInchesInput, setHeightInchesInput] = useState(String(initialHeightImperial.inches));
  const [weightKgInput, setWeightKgInput] = useState(String(Math.round(initialWeightKg)));
  const [weightLbInput, setWeightLbInput] = useState(String(kgToLb(initialWeightKg)));
  const [gender, setGender] = useState<GenderUI | null>((draft.gender as GenderUI) ?? null);
  const [activePanel, setActivePanel] = useState<ActivePanel>('dob');

  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    fade.setValue(0.75);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [activePanel, fade]);

  useEffect(() => {
    const maxDay = daysInMonth(year, monthIndex);
    if (day > maxDay) {
      setDay(maxDay);
    }
  }, [day, monthIndex, year]);

  useEffect(() => {
    setDayInput(String(day));
  }, [day]);

  useEffect(() => {
    setYearInput(String(year));
  }, [year]);

  useEffect(() => {
    if (usesImperial) {
      const heightImperial = cmToFeetInches(heightCm);
      setHeightFeetInput(String(heightImperial.feet));
      setHeightInchesInput(String(heightImperial.inches));
      setWeightLbInput(String(kgToLb(weightKg)));
      return;
    }

    setHeightCmInput(String(Math.round(heightCm)));
    setWeightKgInput(String(Math.round(weightKg)));
  }, [usesImperial]);

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
  const heightImperial = useMemo(() => cmToFeetInches(heightCm), [heightCm]);
  const weightLb = useMemo(() => kgToLb(weightKg), [weightKg]);
  const dobLabel = useMemo(() => `${MONTHS[monthIndex]} ${day}, ${year}`, [day, monthIndex, year]);

  const handleHeightCmChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 3);
    setHeightCmInput(sanitized);

    if (!sanitized) return;
    setHeightCm(clamp(Number.parseInt(sanitized, 10), MIN_HEIGHT_CM, MAX_HEIGHT_CM));
  };

  const normalizeHeightCmInput = () => {
    const parsed = Number.parseInt(heightCmInput, 10);
    const nextValue = clamp(
      Number.isFinite(parsed) ? parsed : Math.round(heightCm),
      MIN_HEIGHT_CM,
      MAX_HEIGHT_CM
    );

    setHeightCm(nextValue);
    setHeightCmInput(String(nextValue));
  };

  const syncImperialHeight = (feetValue: string, inchesValue: string) => {
    const feet = Number.parseInt(feetValue, 10);
    const inches = Number.parseInt(inchesValue, 10);

    if (!Number.isFinite(feet) && !Number.isFinite(inches)) return;

    const nextFeet = Number.isFinite(feet) ? feet : 0;
    const nextInches = Number.isFinite(inches) ? inches : 0;
    const nextHeightCm = clamp(
      feetInchesToCm(nextFeet, nextInches),
      MIN_HEIGHT_CM,
      MAX_HEIGHT_CM
    );

    setHeightCm(nextHeightCm);
  };

  const handleHeightFeetChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 1);
    setHeightFeetInput(sanitized);
    syncImperialHeight(sanitized, heightInchesInput);
  };

  const handleHeightInchesChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 2);
    setHeightInchesInput(sanitized);
    syncImperialHeight(heightFeetInput, sanitized);
  };

  const normalizeImperialHeightInput = () => {
    const feet = Number.parseInt(heightFeetInput, 10);
    const inches = Number.parseInt(heightInchesInput, 10);
    const fallback = cmToFeetInches(heightCm);
    const nextHeightCm = clamp(
      feetInchesToCm(
        Number.isFinite(feet) ? feet : fallback.feet,
        Number.isFinite(inches) ? inches : fallback.inches
      ),
      MIN_HEIGHT_CM,
      MAX_HEIGHT_CM
    );
    const normalized = cmToFeetInches(nextHeightCm);

    setHeightCm(nextHeightCm);
    setHeightFeetInput(String(normalized.feet));
    setHeightInchesInput(String(normalized.inches));
  };

  const handleWeightKgChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 3);
    setWeightKgInput(sanitized);

    if (!sanitized) return;
    setWeightKg(clamp(Number.parseInt(sanitized, 10), MIN_WEIGHT_KG, MAX_WEIGHT_KG));
  };

  const normalizeWeightKgInput = () => {
    const parsed = Number.parseInt(weightKgInput, 10);
    const nextValue = clamp(
      Number.isFinite(parsed) ? parsed : Math.round(weightKg),
      MIN_WEIGHT_KG,
      MAX_WEIGHT_KG
    );

    setWeightKg(nextValue);
    setWeightKgInput(String(nextValue));
  };

  const handleWeightLbChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 3);
    setWeightLbInput(sanitized);

    if (!sanitized) return;
    setWeightKg(clamp(lbToKg(Number.parseInt(sanitized, 10)), MIN_WEIGHT_KG, MAX_WEIGHT_KG));
  };

  const normalizeWeightLbInput = () => {
    const parsed = Number.parseInt(weightLbInput, 10);
    const nextKg = clamp(
      lbToKg(Number.isFinite(parsed) ? parsed : weightLb),
      MIN_WEIGHT_KG,
      MAX_WEIGHT_KG
    );

    setWeightKg(nextKg);
    setWeightLbInput(String(kgToLb(nextKg)));
  };

  const handleDayChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 2);
    setDayInput(sanitized);

    if (!sanitized) return;
    setDay(clamp(Number.parseInt(sanitized, 10), 1, daysInMonth(year, monthIndex)));
  };

  const normalizeDayInput = () => {
    const parsed = Number.parseInt(dayInput, 10);
    const nextDay = clamp(
      Number.isFinite(parsed) ? parsed : day,
      1,
      daysInMonth(year, monthIndex)
    );

    setDay(nextDay);
    setDayInput(String(nextDay));
  };

  const handleYearChange = (value: string) => {
    const sanitized = digitsOnly(value).slice(0, 4);
    setYearInput(sanitized);

    if (!sanitized) return;
    setYear(clamp(Number.parseInt(sanitized, 10), 1900, new Date().getFullYear()));
  };

  const normalizeYearInput = () => {
    const parsed = Number.parseInt(yearInput, 10);
    const nextYear = clamp(
      Number.isFinite(parsed) ? parsed : year,
      1900,
      new Date().getFullYear()
    );

    setYear(nextYear);
    setYearInput(String(nextYear));
  };

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
      showBackButton
      backTo="/SignInLogin/onboarding/UserInfo1"
    >
      <View style={styles.rail}>
        <RailButton
          title="DOB"
          value={dobLabel}
          icon="calendar-outline"
          selected={activePanel === 'dob'}
          onPress={() => setActivePanel('dob')}
        />
        <RailButton
          title="Height"
          value={
            usesImperial
              ? `${heightImperial.feet} ft ${heightImperial.inches} in`
              : `${Math.round(heightCm)} cm`
          }
          icon="resize-outline"
          selected={activePanel === 'height'}
          onPress={() => setActivePanel('height')}
        />
        <RailButton
          title="Weight"
          value={usesImperial ? `${weightLb} lb` : `${Math.round(weightKg)} kg`}
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
            <View style={styles.dobSummaryCard}>
              <Text style={styles.dobSummaryLabel}>Selected date</Text>
              <Text style={styles.dobSummaryValue}>{dobLabel}</Text>
            </View>

            <Text style={styles.measurementLabel}>Month</Text>
            <View style={styles.monthGrid}>
              {MONTHS.map((month, index) => {
                const selected = index === monthIndex;
                return (
                  <TouchableOpacity
                    key={month}
                    activeOpacity={0.92}
                    style={[styles.monthChip, selected ? styles.monthChipSelected : null]}
                    onPress={() => setMonthIndex(index)}
                  >
                    <Text
                      style={[
                        styles.monthChipText,
                        selected ? styles.monthChipTextSelected : null,
                      ]}
                    >
                      {month}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.measurementRow}>
              <View style={[styles.measurementField, styles.measurementFieldSplit]}>
                <Text style={styles.measurementLabel}>Day</Text>
                <View style={styles.measurementInputRow}>
                  <TextInput
                    value={dayInput}
                    onChangeText={handleDayChange}
                    onBlur={normalizeDayInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    style={styles.measurementInput}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    selectTextOnFocus
                  />
                </View>
              </View>

              <View style={[styles.measurementField, styles.measurementFieldWide]}>
                <Text style={styles.measurementLabel}>Year</Text>
                <View style={styles.measurementInputRow}>
                  <TextInput
                    value={yearInput}
                    onChangeText={handleYearChange}
                    onBlur={normalizeYearInput}
                    keyboardType="number-pad"
                    maxLength={4}
                    style={styles.measurementInput}
                    placeholder="2001"
                    placeholderTextColor={colors.textMuted}
                    selectTextOnFocus
                  />
                </View>
              </View>
            </View>
          </View>
        ) : null}

        {activePanel === 'height' ? (
          <View>
            <Text style={styles.panelTitle}>Height</Text>
            <View style={styles.measurementRow}>
              {usesImperial ? (
                <>
                  <View style={[styles.measurementField, styles.measurementFieldSplit]}>
                    <Text style={styles.measurementLabel}>Feet</Text>
                    <View style={styles.measurementInputRow}>
                      <TextInput
                        value={heightFeetInput}
                        onChangeText={handleHeightFeetChange}
                        onBlur={normalizeImperialHeightInput}
                        keyboardType="number-pad"
                        maxLength={1}
                        style={styles.measurementInput}
                        placeholder="5"
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                      <Text style={styles.measurementUnit}>ft</Text>
                    </View>
                  </View>

                  <View style={[styles.measurementField, styles.measurementFieldSplit]}>
                    <Text style={styles.measurementLabel}>Inches</Text>
                    <View style={styles.measurementInputRow}>
                      <TextInput
                        value={heightInchesInput}
                        onChangeText={handleHeightInchesChange}
                        onBlur={normalizeImperialHeightInput}
                        keyboardType="number-pad"
                        maxLength={2}
                        style={styles.measurementInput}
                        placeholder="10"
                        placeholderTextColor={colors.textMuted}
                        selectTextOnFocus
                      />
                      <Text style={styles.measurementUnit}>in</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.measurementField}>
                  <Text style={styles.measurementLabel}>Centimeters</Text>
                  <View style={styles.measurementInputRow}>
                    <TextInput
                      value={heightCmInput}
                      onChangeText={handleHeightCmChange}
                      onBlur={normalizeHeightCmInput}
                      keyboardType="number-pad"
                      maxLength={3}
                      style={styles.measurementInput}
                      placeholder="175"
                      placeholderTextColor={colors.textMuted}
                      selectTextOnFocus
                    />
                    <Text style={styles.measurementUnit}>cm</Text>
                  </View>
                </View>
              )}
            </View>
            <Text style={styles.hint}>Used for basic calculations and progress analytics.</Text>
          </View>
        ) : null}

        {activePanel === 'weight' ? (
          <View>
            <Text style={styles.panelTitle}>Weight</Text>
            <View style={styles.measurementRow}>
              <View style={styles.measurementField}>
                <Text style={styles.measurementLabel}>
                  {usesImperial ? 'Pounds' : 'Kilograms'}
                </Text>
                <View style={styles.measurementInputRow}>
                  <TextInput
                    value={usesImperial ? weightLbInput : weightKgInput}
                    onChangeText={usesImperial ? handleWeightLbChange : handleWeightKgChange}
                    onBlur={usesImperial ? normalizeWeightLbInput : normalizeWeightKgInput}
                    keyboardType="number-pad"
                    maxLength={3}
                    style={styles.measurementInput}
                    placeholder={usesImperial ? '165' : '75'}
                    placeholderTextColor={colors.textMuted}
                    selectTextOnFocus
                  />
                  <Text style={styles.measurementUnit}>{usesImperial ? 'lb' : 'kg'}</Text>
                </View>
              </View>
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
    dobSummaryCard: {
      borderRadius: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 14,
    },
    dobSummaryLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 14,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    dobSummaryValue: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 22,
      lineHeight: 26,
      letterSpacing: -0.5,
    },
    monthGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginBottom: 4,
    },
    monthChip: {
      width: '22%',
      minWidth: 58,
      borderRadius: 16,
      paddingVertical: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
    },
    monthChipSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    monthChipText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    monthChipTextSelected: {
      color: colors.blkText,
    },
    measurementRow: {
      marginTop: 18,
      flexDirection: 'row',
      gap: 12,
    },
    measurementField: {
      flex: 1,
      borderRadius: 20,
      backgroundColor: colors.surfaceRaised,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    measurementFieldSplit: {
      flex: 1,
    },
    measurementFieldWide: {
      flex: 1.4,
    },
    measurementLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 15,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    measurementInputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    measurementInput: {
      flex: 1,
      minHeight: 40,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
      paddingVertical: 0,
    },
    measurementUnit: {
      color: colors.textMuted,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
      textTransform: 'lowercase',
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
