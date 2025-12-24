// app/SignInLogin/onboarding/UserInfo2.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import AppAlert from '../components/AppAlert';

const BG = Colors.dark.background;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

type Params = { authUserId?: string };

type GenderUI = 'female' | 'male' | 'non_binary' | 'prefer_not';
type ActivePanel = 'dob' | 'height' | 'weight' | 'gender';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function daysInMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export default function UserInfo2() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const authUserId = Array.isArray(params.authUserId) ? params.authUserId[0] : params.authUserId;

  const [activePanel, setActivePanel] = useState<ActivePanel>('dob');

  // Panel animate-in (rail stays fixed)
  const panelAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    panelAnim.setValue(0);
    Animated.timing(panelAnim, {
      toValue: 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [activePanel, panelAnim]);

  const panelStyle = useMemo(() => {
    const opacity = panelAnim;
    const translateX = panelAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [16, 0],
    });
    return { opacity, transform: [{ translateX }] };
  }, [panelAnim]);

  // --- DOB ---
  const now = new Date();
  const currentYear = now.getFullYear();

  const [dobMonth, setDobMonth] = useState<number>(now.getMonth());
  const [dobYear, setDobYear] = useState<number>(Math.max(1990, currentYear - 25));
  const [dobDay, setDobDay] = useState<number>(Math.min(15, daysInMonth(dobYear, dobMonth)));

  const dayOptions = useMemo(() => {
    const n = daysInMonth(dobYear, dobMonth);
    return Array.from({ length: n }, (_, i) => i + 1);
  }, [dobYear, dobMonth]);

  useEffect(() => {
    const maxDay = daysInMonth(dobYear, dobMonth);
    if (dobDay > maxDay) setDobDay(maxDay);
  }, [dobYear, dobMonth]); // eslint-disable-line react-hooks/exhaustive-deps

  const yearOptions = useMemo(() => {
    const start = 1900;
    const end = currentYear;
    const years: number[] = [];
    for (let y = end; y >= start; y--) years.push(y);
    return years;
  }, [currentYear]);

  // --- Height/Weight ---
  const [isMetric, setIsMetric] = useState(false);

  const [ft, setFt] = useState(5);
  const [inch, setInch] = useState(10);
  const [lbs, setLbs] = useState(170);

  const [cm, setCm] = useState(178);
  const [kg, setKg] = useState(77);

  // --- Gender ---
  const [gender, setGender] = useState<GenderUI | null>(null);

  // --- Prefill ---
  useEffect(() => {
    const load = async () => {
      if (!authUserId) return;

      const { data, error } = await supabase
        .schema('user')
        .from('profiles')
        .select('date_of_birth,height_cm,weight_kg,gender')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error || !data) return;

      if (data.date_of_birth) {
        const d = new Date(data.date_of_birth);
        if (!Number.isNaN(d.getTime())) {
          setDobYear(d.getFullYear());
          setDobMonth(d.getMonth());
          setDobDay(d.getDate());
        }
      }

      if (typeof data.height_cm === 'number') {
        const cmVal = Math.round(data.height_cm);
        setCm(cmVal);

        const totalInches = cmVal / 2.54;
        const ftVal = Math.floor(totalInches / 12);
        const inVal = Math.round(totalInches - ftVal * 12);
        setFt(Math.max(3, Math.min(8, ftVal)));
        setInch(Math.max(0, Math.min(11, inVal)));
      }

      if (typeof data.weight_kg === 'number') {
        const kgVal = Math.round(data.weight_kg);
        setKg(kgVal);

        const lbsVal = Math.round(kgVal / 0.45359237);
        setLbs(Math.max(60, Math.min(400, lbsVal)));
      }

      if (data.gender) {
        const g = String(data.gender).toLowerCase();
        if (g.includes('female')) setGender('female');
        else if (g.includes('male')) setGender('male');
        else if (g.includes('non')) setGender('non_binary');
        else if (g.includes('prefer')) setGender('prefer_not');
      }
    };

    load();
  }, [authUserId]);

  // --- Alerts ---
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

  // --- Display helpers ---
  const dobISO = useMemo(() => {
    const m = dobMonth + 1;
    return `${dobYear}-${pad2(m)}-${pad2(dobDay)}`;
  }, [dobYear, dobMonth, dobDay]);

  const dobDisplay = useMemo(
    () => `${MONTHS[dobMonth]} ${dobDay}, ${dobYear}`,
    [dobMonth, dobDay, dobYear],
  );

  const heightDisplay = useMemo(() => (isMetric ? `${cm} cm` : `${ft} ft ${inch} in`), [isMetric, cm, ft, inch]);
  const weightDisplay = useMemo(() => (isMetric ? `${kg} kg` : `${lbs} lbs`), [isMetric, kg, lbs]);

  const genderDisplay = useMemo(() => {
    if (!gender) return 'Select';
    if (gender === 'female') return 'Female';
    if (gender === 'male') return 'Male';
    if (gender === 'non_binary') return 'Non-binary';
    return 'Prefer not';
  }, [gender]);

  const mapGenderToDb = (g: GenderUI): string => {
    if (g === 'female') return 'female';
    if (g === 'male') return 'male';
    if (g === 'non_binary') return 'non_binary';
    return 'prefer_not_to_choose';
  };

  const computeCmKg = () => {
    if (isMetric) return { height_cm: cm, weight_kg: kg };
    const inchesTotal = ft * 12 + inch;
    const height_cm = Math.round(inchesTotal * 2.54 * 100) / 100;
    const weight_kg = Math.round(lbs * 0.45359237 * 100) / 100;
    return { height_cm, weight_kg };
  };

  // Pickers
  const ftOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => i + 3), []);
  const inchOptions = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);
  const lbsOptions = useMemo(() => Array.from({ length: 341 }, (_, i) => i + 60), []);
  const cmOptions = useMemo(() => Array.from({ length: 131 }, (_, i) => i + 100), []);
  const kgOptions = useMemo(() => Array.from({ length: 171 }, (_, i) => i + 30), []);

  // Save
  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!authUserId) {
      showAlert('Error', 'Missing auth user id.');
      return;
    }

    if (!gender) {
      showAlert('Missing info', 'Please select a gender option to continue.');
      setActivePanel('gender');
      return;
    }

    setSaving(true);
    try {
      const { height_cm, weight_kg } = computeCmKg();

      const payload: any = {
        date_of_birth: dobISO,
        height_cm,
        weight_kg,
        gender: mapGenderToDb(gender),
      };

      const { error } = await supabase
        .schema('user')
        .from('profiles')
        .update(payload)
        .eq('auth_user_id', authUserId);

      if (error) {
        showAlert('Error', 'Could not save your info. Please try again.');
        return;
      }

      showAlert('Saved', 'Step 2/5 completed.');
      // router.replace({ pathname: './UserInfo3', params: { authUserId } });
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => router.back();

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

  const panelTitle = useMemo(() => {
    if (activePanel === 'dob') return 'Select your birthday';
    if (activePanel === 'height') return 'Select your height';
    if (activePanel === 'weight') return 'Select your weight';
    return 'Choose your gender';
  }, [activePanel]);

  const panelPrompt = useMemo(() => {
    if (activePanel === 'dob') return 'When were you born?';
    if (activePanel === 'height') return 'Set your height for a better physiological profile.';
    if (activePanel === 'weight') return 'Set your weight for more accurate metrics.';
    return 'Choose the gender your physiology best aligns with.';
  }, [activePanel]);

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={styles.container}>
        <LogoHeader />

        <View style={styles.topRow}>

          <View style={styles.topTextBlock}>
            <Text style={styles.topTitle}>{panelTitle.toUpperCase()}</Text>
            <Text style={styles.topStep}>STEP 2/5</Text>
          </View>

          <View style={{ width: 44 }} />
        </View>

        {/* MAIN AREA: fixed rail + changing panel */}
        <View style={styles.mainArea}>
          {/* Fixed left rail */}
          <View style={styles.rail}>
            <RailButton
              title="BIRTHDAY"
              value={dobDisplay}
              icon="calendar-outline"
              selected={activePanel === 'dob'}
              onPress={() => setActivePanel('dob')}
            />
            <RailButton
              title="HEIGHT"
              value={heightDisplay}
              icon="resize-outline"
              selected={activePanel === 'height'}
              onPress={() => setActivePanel('height')}
            />
            <RailButton
              title="WEIGHT"
              value={weightDisplay}
              icon="barbell-outline"
              selected={activePanel === 'weight'}
              onPress={() => setActivePanel('weight')}
            />
            <RailButton
              title="GENDER"
              value={genderDisplay}
              icon="person-outline"
              selected={activePanel === 'gender'}
              onPress={() => setActivePanel('gender')}
            />
          </View>

          {/* Bottom panel (animated) */}
          <View style={styles.panelArea}>
            <Text style={styles.centerPrompt}>
              {activePanel === 'dob' ? panelPrompt.toUpperCase() : panelPrompt}
            </Text>

            <Animated.View style={[styles.panelCard, panelStyle]}>
              {(activePanel === 'height' || activePanel === 'weight') && (
                <View style={styles.unitToggleRow}>
                  <Text style={[styles.unitLabel, !isMetric && styles.unitLabelActive]}>IMPERIAL</Text>
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => setIsMetric((p) => !p)}
                    style={styles.unitSwitch}
                  >
                    <View style={[styles.unitKnob, isMetric && styles.unitKnobRight]} />
                  </TouchableOpacity>
                  <Text style={[styles.unitLabel, isMetric && styles.unitLabelActive]}>METRIC</Text>
                </View>
              )}

              {/* CHANGED: DOB columns use month/day/year-specific widths */}
              {activePanel === 'dob' && (
                <View style={styles.wheelRow}>
                  <View style={styles.wheelMonth}>
                    <Picker
                      selectedValue={dobMonth}
                      onValueChange={(v) => setDobMonth(Number(v))}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {MONTHS.map((m, idx) => (
                        <Picker.Item key={m} label={m} value={idx} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.wheelDay}>
                    <Picker
                      selectedValue={dobDay}
                      onValueChange={(v) => setDobDay(Number(v))}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {dayOptions.map((d) => (
                        <Picker.Item key={d} label={String(d)} value={d} />
                      ))}
                    </Picker>
                  </View>

                  <View style={styles.wheelYear}>
                    <Picker
                      selectedValue={dobYear}
                      onValueChange={(v) => setDobYear(Number(v))}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {yearOptions.map((y) => (
                        <Picker.Item key={y} label={String(y)} value={y} />
                      ))}
                    </Picker>
                  </View>

                  <View pointerEvents="none" style={styles.selectionOverlay} />
                </View>
              )}

              {activePanel === 'height' && (
                <View style={styles.wheelRow}>
                  {!isMetric ? (
                    <>
                      <View style={styles.wheelColumnSmall}>
                        <Picker
                          selectedValue={ft}
                          onValueChange={(v) => setFt(Number(v))}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          {ftOptions.map((v) => (
                            <Picker.Item key={v} label={`${v} ft`} value={v} />
                          ))}
                        </Picker>
                      </View>

                      <View style={styles.wheelColumnSmall}>
                        <Picker
                          selectedValue={inch}
                          onValueChange={(v) => setInch(Number(v))}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          {inchOptions.map((v) => (
                            <Picker.Item key={v} label={`${v} in`} value={v} />
                          ))}
                        </Picker>
                      </View>

                      <View pointerEvents="none" style={styles.selectionOverlay} />
                    </>
                  ) : (
                    <>
                      <View style={styles.wheelColumn}>
                        <Picker
                          selectedValue={cm}
                          onValueChange={(v) => setCm(Number(v))}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          {cmOptions.map((v) => (
                            <Picker.Item key={v} label={`${v} cm`} value={v} />
                          ))}
                        </Picker>
                      </View>

                      <View pointerEvents="none" style={styles.selectionOverlay} />
                    </>
                  )}
                </View>
              )}

              {activePanel === 'weight' && (
                <View style={styles.wheelRow}>
                  {!isMetric ? (
                    <>
                      <View style={styles.wheelColumn}>
                        <Picker
                          selectedValue={lbs}
                          onValueChange={(v) => setLbs(Number(v))}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          {lbsOptions.map((v) => (
                            <Picker.Item key={v} label={`${v} lbs`} value={v} />
                          ))}
                        </Picker>
                      </View>

                      <View pointerEvents="none" style={styles.selectionOverlay} />
                    </>
                  ) : (
                    <>
                      <View style={styles.wheelColumn}>
                        <Picker
                          selectedValue={kg}
                          onValueChange={(v) => setKg(Number(v))}
                          style={styles.picker}
                          itemStyle={styles.pickerItem}
                        >
                          {kgOptions.map((v) => (
                            <Picker.Item key={v} label={`${v} kg`} value={v} />
                          ))}
                        </Picker>
                      </View>

                      <View pointerEvents="none" style={styles.selectionOverlay} />
                    </>
                  )}
                </View>
              )}

              {activePanel === 'gender' && (
                <View style={styles.genderBlock}>
                  <GenderButton value="female" label="FEMALE" />
                  <GenderButton value="male" label="MALE" />
                  <GenderButton value="non_binary" label="NON-BINARY" />
                  <GenderButton value="prefer_not" label="I PREFER NOT TO CHOOSE" />
                </View>
              )}
            </Animated.View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.nextButton, saving ? { opacity: 0.7 } : null]}
          activeOpacity={0.9}
          onPress={handleNext}
          disabled={saving}
        >
          {saving ? <ActivityIndicator /> : <Text style={styles.nextText}>NEXT</Text>}
        </TouchableOpacity>

        <AppAlert visible={alertVisible} title={alertTitle} message={alertMessage} onClose={handleCloseAlert} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 6 },

  topRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTextBlock: { flex: 1, paddingLeft: 12 },
  topTitle: { color: TEXT_PRIMARY, fontSize: 18, fontWeight: '700', letterSpacing: 1.2 },
  topStep: { marginTop: 2, color: TEXT_MUTED, fontSize: 12, fontWeight: '600', letterSpacing: 1.1 },

  // Main rail + panel
  mainArea: {
    flex: 1,
    flexDirection: 'column',
    gap: 12,
    marginTop: 10,
  },

  // Fixed rail (single column)
  rail: {
    width: 332, // fixed location/width
    gap: 10,
  },
  railBtn: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 10,
    minHeight: 25,
    justifyContent: 'space-between',
  },
  railBtnSelected: {
    backgroundColor: '#fff',
    borderColor: '#fff',
  },
  railBtnUnselected: {
    backgroundColor: 'rgba(176,176,176,0.18)',
    borderColor: 'rgba(123,123,123,0.9)',
  },
  railTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  railTitle: { color: TEXT_PRIMARY, fontSize: 11, fontWeight: '900', letterSpacing: 1.1 },
  railTitleSelected: { color: '#0b0f18' },
  railValue: { color: TEXT_PRIMARY, fontSize: 13, fontWeight: '800' },
  railValueSelected: { color: '#0b0f18' },

  // Right side panel
  panelArea: { flex: 1 },

  centerPrompt: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 6,
  },

  panelCard: {
    width: '100%',
    borderRadius: 18,
    padding: 14,
    backgroundColor: 'rgba(19, 24, 43, 0)',
    borderWidth: 1,
    borderColor: 'rgba(147, 147, 147, 0.4)',
  },

  // Wheels
  wheelRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 32,  
    position: 'relative',
  },
  wheelColumn: {
    flex: 1,
    backgroundColor: 'rgba(176,176,176,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,123,123,0.9)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  wheelColumnSmall: {
    width: 118,
    backgroundColor: 'rgba(176,176,176,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,123,123,0.9)',
    borderRadius: 14,
    overflow: 'hidden',
  },

  // CHANGED: DOB-specific column widths
  wheelMonth: {
    flex: 1,
    minWidth: 140,
    backgroundColor: 'rgba(176,176,176,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,123,123,0.9)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  wheelDay: {
    width: 80,
    backgroundColor: 'rgba(176,176,176,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,123,123,0.9)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  wheelYear: {
    width: 108,
    backgroundColor: 'rgba(176,176,176,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123,123,123,0.9)',
    borderRadius: 14,
    overflow: 'hidden',
  },

  picker: { height: Platform.OS === 'ios' ? 210 : 180, width: '100%' },
  pickerItem: { color: TEXT_PRIMARY, fontSize: 16, fontWeight: '600' },
  selectionOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: Platform.OS === 'ios' ? 90 : 74,
    height: Platform.OS === 'ios' ? 44 : 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Unit toggle
  unitToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginBottom: 12,
  },
  unitLabel: { color: TEXT_MUTED, fontWeight: '800', letterSpacing: 1.2 },
  unitLabelActive: { color: TEXT_PRIMARY },
  unitSwitch: {
    width: 62,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(176,176,176,0.22)',
    borderWidth: 1,
    borderColor: 'rgba(123,123,123,0.9)',
    padding: 3,
    justifyContent: 'center',
  },
  unitKnob: { width: 26, height: 26, borderRadius: 13, backgroundColor: '#fff', transform: [{ translateX: 0 }] },
  unitKnobRight: { transform: [{ translateX: 30 }] },

  helperText: {
    marginTop: 14,
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 14,
    lineHeight: 16,
  },

  // Gender
  genderBlock: { width: '100%', gap: 12, marginTop: 6 },

  // CHANGED: smaller height + font size 14
  genderButton: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1.5,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderSelected: { backgroundColor: '#fff', borderColor: '#fff' },
  genderUnselected: { backgroundColor: 'rgba(176,176,176,0.18)', borderColor: 'rgba(123,123,123,0.9)' },
  genderText: { fontSize: 14, fontWeight: '800', letterSpacing: 1.2 },
  genderTextSelected: { color: '#0b0f18' },
  genderTextUnselected: { color: TEXT_PRIMARY },

  // Bottom next
  nextButton: {
    marginBottom: 26,
    borderWidth: 2,
    borderColor: PRIMARY,
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextText: { color: PRIMARY, fontSize: 15, fontWeight: '900', letterSpacing: 2 },
});
