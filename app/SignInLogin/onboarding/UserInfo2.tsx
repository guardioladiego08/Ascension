// app/SignInLogin/onboarding/UserInfo2.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from '../components/AppAlert';

import { useOnboardingDraftStore, type DbGender } from '@/lib/onboarding/onboardingDraftStore';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

type GenderUI = 'female' | 'male' | 'non_binary' | 'prefer_not';
type ActivePanel = 'dob' | 'height' | 'weight' | 'gender';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default function UserInfo2() {
  const router = useRouter();
  const { draft, setDraft } = useOnboardingDraftStore();

  // DOB local UI state
  const initialDOB = useMemo(() => {
    if (draft.DOB) {
      const [yy, mm, dd] = draft.DOB.split('-').map((x) => parseInt(x, 10));
      if (yy && mm && dd) return { year: yy, monthIndex: mm - 1, day: dd };
    }
    const now = new Date();
    return { year: now.getFullYear() - 25, monthIndex: 0, day: 1 };
  }, [draft.DOB]);

  const [year, setYear] = useState(initialDOB.year);
  const [monthIndex, setMonthIndex] = useState(initialDOB.monthIndex);
  const [day, setDay] = useState(initialDOB.day);

  // height/weight (store is cm/kg)
  const [heightCm, setHeightCm] = useState<number>(draft.height_cm ?? 175);
  const [weightKg, setWeightKg] = useState<number>(draft.weight_kg ?? 75);

  const [gender, setGender] = useState<GenderUI | null>((draft.gender as GenderUI) ?? null);

  const [activePanel, setActivePanel] = useState<ActivePanel>('dob');

  // animation (kept from your style)
  const fade = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [activePanel]);

  const dobISO = useMemo(() => {
    const m = clamp(monthIndex, 0, 11);
    const y = clamp(year, 1900, new Date().getFullYear());
    const maxDay = daysInMonth(y, m);
    const d = clamp(day, 1, maxDay);
    return `${y}-${pad2(m + 1)}-${pad2(d)}`;
  }, [year, monthIndex, day]);

  // Alerts
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

  const canContinue = useMemo(() => !!gender, [gender]);

  const handleBack = () => router.replace('./UserInfo1');

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

    router.replace('./UserInfo3');
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
  }) => {
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={onPress}
        style={[styles.railBtn, selected ? styles.railBtnSelected : styles.railBtnUnselected]}
      >
        <View style={styles.railTopRow}>
          <Ionicons name={icon} size={18} color={selected ? '#0b0f18' : TEXT_PRIMARY} />
          <Text style={[styles.railTitle, selected ? styles.railTitleSelected : null]}>{title}</Text>
          <Text style={[styles.railValue, selected ? styles.railValueSelected : null]} numberOfLines={1}>
            {value}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const GenderButton = ({ value, label }: { value: GenderUI; label: string }) => {
    const selected = gender === value;
    return (
      <TouchableOpacity
        onPress={() => setGender(value)}
        activeOpacity={0.9}
        style={[styles.genderButton, selected ? styles.genderSelected : styles.genderUnselected]}
      >
        <Text style={[styles.genderText, selected ? styles.genderTextSelected : styles.genderTextUnselected]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LogoHeader />

        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.iconBtn}>
            <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Details</Text>
          <View style={{ width: 36 }} />
        </View>

        <Text style={styles.stepText}>Step 2/4</Text>

        <View style={styles.rail}>
          <RailButton
            title="DOB"
            value={dobISO}
            icon="calendar-outline"
            selected={activePanel === 'dob'}
            onPress={() => setActivePanel('dob')}
          />
          <RailButton
            title="HEIGHT"
            value={`${Math.round(heightCm)} cm`}
            icon="resize-outline"
            selected={activePanel === 'height'}
            onPress={() => setActivePanel('height')}
          />
          <RailButton
            title="WEIGHT"
            value={`${Math.round(weightKg)} kg`}
            icon="barbell-outline"
            selected={activePanel === 'weight'}
            onPress={() => setActivePanel('weight')}
          />
          <RailButton
            title="GENDER"
            value={gender ? gender.replace('_', ' ') : 'Select'}
            icon="person-outline"
            selected={activePanel === 'gender'}
            onPress={() => setActivePanel('gender')}
          />
        </View>

        <Animated.View style={[styles.panel, { opacity: fade }]}>
          {activePanel === 'dob' && (
            <View>
              <Text style={styles.panelTitle}>Date of Birth</Text>
              <View style={styles.pickerRow}>
                <View style={styles.pickerWrap}>
                  <Text style={styles.pickerLabel}>Month</Text>
                  <Picker
                    selectedValue={monthIndex}
                    onValueChange={(v) => setMonthIndex(Number(v))}
                    style={styles.picker}
                    dropdownIconColor={TEXT_PRIMARY}
                  >
                    {MONTHS.map((m, i) => (
                      <Picker.Item key={m} label={m} value={i} color={TEXT_PRIMARY} />
                    ))}
                  </Picker>
                </View>

                <View style={styles.pickerWrap}>
                  <Text style={styles.pickerLabel}>Day</Text>
                  <Picker
                    selectedValue={day}
                    onValueChange={(v) => setDay(Number(v))}
                    style={styles.picker}
                    dropdownIconColor={TEXT_PRIMARY}
                  >
                    {Array.from({ length: daysInMonth(year, monthIndex) }, (_, i) => i + 1).map((d) => (
                      <Picker.Item key={String(d)} label={String(d)} value={d} color={TEXT_PRIMARY} />
                    ))}
                  </Picker>
                </View>

                <View style={styles.pickerWrap}>
                  <Text style={styles.pickerLabel}>Year</Text>
                  <Picker
                    selectedValue={year}
                    onValueChange={(v) => setYear(Number(v))}
                    style={styles.picker}
                    dropdownIconColor={TEXT_PRIMARY}
                  >
                    {Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                      <Picker.Item key={String(y)} label={String(y)} value={y} color={TEXT_PRIMARY} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>
          )}

          {activePanel === 'height' && (
            <View>
              <Text style={styles.panelTitle}>Height (cm)</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setHeightCm((v) => Math.max(90, v - 1))}>
                  <Ionicons name="remove" size={20} color={TEXT_PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{Math.round(heightCm)} cm</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setHeightCm((v) => Math.min(230, v + 1))}>
                  <Ionicons name="add" size={20} color={TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>Used for basic calculations and analytics.</Text>
            </View>
          )}

          {activePanel === 'weight' && (
            <View>
              <Text style={styles.panelTitle}>Weight (kg)</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setWeightKg((v) => Math.max(25, v - 1))}>
                  <Ionicons name="remove" size={20} color={TEXT_PRIMARY} />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{Math.round(weightKg)} kg</Text>
                <TouchableOpacity style={styles.counterBtn} onPress={() => setWeightKg((v) => Math.min(250, v + 1))}>
                  <Ionicons name="add" size={20} color={TEXT_PRIMARY} />
                </TouchableOpacity>
              </View>
              <Text style={styles.hint}>You can update this anytime.</Text>
            </View>
          )}

          {activePanel === 'gender' && (
            <View>
              <Text style={styles.panelTitle}>Gender</Text>
              <View style={{ marginTop: 10, gap: 10 }}>
                <GenderButton value="female" label="Female" />
                <GenderButton value="male" label="Male" />
                <GenderButton value="non_binary" label="Non-binary" />
                <GenderButton value="prefer_not" label="Prefer not to say" />
              </View>
              <Text style={styles.hint}>Used for optional personalization.</Text>
            </View>
          )}
        </Animated.View>

        <TouchableOpacity
          style={[styles.primaryBtn, !canContinue ? { opacity: 0.6 } : null]}
          activeOpacity={0.9}
          onPress={handleNext}
        >
          <Text style={styles.primaryBtnText}>Continue</Text>
          <Ionicons name="arrow-forward" size={18} color="#0b0f18" />
        </TouchableOpacity>

        <AppAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={handleCloseAlert}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 18, paddingTop: Platform.OS === 'ios' ? 54 : 38 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 },
  headerTitle: { color: TEXT_PRIMARY, fontSize: 26, fontWeight: '700' },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  stepText: { color: TEXT_MUTED, marginTop: 8, marginBottom: 12 },

  rail: { gap: 10, marginBottom: 12 },
  railBtn: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 12 },
  railBtnSelected: { backgroundColor: PRIMARY },
  railBtnUnselected: { backgroundColor: 'rgba(255,255,255,0.06)' },
  railTopRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  railTitle: { color: TEXT_PRIMARY, fontWeight: '800' },
  railTitleSelected: { color: '#0b0f18' },
  railValue: { marginLeft: 'auto', color: TEXT_MUTED, maxWidth: 140 },
  railValueSelected: { color: '#0b0f18', fontWeight: '700' },

  panel: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 18, padding: 16, minHeight: 210 },
  panelTitle: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '800', marginBottom: 10 },
  hint: { color: TEXT_MUTED, marginTop: 12, fontSize: 12 },

  pickerRow: { flexDirection: 'row', gap: 10 },
  pickerWrap: { flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 8 },
  pickerLabel: { color: TEXT_MUTED, fontSize: 12, marginBottom: 6 },
  picker: { color: TEXT_PRIMARY },

  counterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: { color: TEXT_PRIMARY, fontSize: 20, fontWeight: '900' },

  genderButton: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 14 },
  genderSelected: { backgroundColor: PRIMARY },
  genderUnselected: { backgroundColor: 'rgba(255,255,255,0.06)' },
  genderText: { fontSize: 14, fontWeight: '800' },
  genderTextSelected: { color: '#0b0f18' },
  genderTextUnselected: { color: TEXT_PRIMARY },

  primaryBtn: {
    marginTop: 16,
    backgroundColor: PRIMARY,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  primaryBtnText: { color: '#0b0f18', fontWeight: '800', fontSize: 15 },
});