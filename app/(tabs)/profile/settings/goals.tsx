import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { supabase } from '@/lib/supabase';
import { Colors } from '@/constants/Colors';
import { useUnits } from '@/contexts/UnitsContext';
import {
  syncAndFetchMyDailyGoalResult,
  toLocalISODate,
} from '@/lib/goals/client';

const BG = Colors.dark?.background ?? '#050816';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.text ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark?.highlight1 ?? '#6366F1';

type CalorieGoalMode = 'disabled' | 'lose' | 'maintain' | 'gain';
type GoalConditionMode = 'and' | 'or';

const KG_TO_LB = 2.20462262185;
const KM_TO_MI = 0.62137119223733;

function convertWeight(value: number, from: 'kg' | 'lb', to: 'kg' | 'lb') {
  if (from === to) return value;
  return from === 'kg' ? value * KG_TO_LB : value / KG_TO_LB;
}

function convertDistance(value: number, from: 'km' | 'mi', to: 'km' | 'mi') {
  if (from === to) return value;
  return from === 'km' ? value * KM_TO_MI : value / KM_TO_MI;
}

export default function GoalSettingsScreen() {
  const router = useRouter();
  const { weightUnit, distanceUnit } = useUnits();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [strengthUseTime, setStrengthUseTime] = useState(false);
  const [strengthTimeMin, setStrengthTimeMin] = useState('');
  const [strengthUseVolume, setStrengthUseVolume] = useState(false);
  const [strengthVolumeMin, setStrengthVolumeMin] = useState('');
  const [strengthConditionMode, setStrengthConditionMode] =
    useState<GoalConditionMode>('and');

  const [cardioUseTime, setCardioUseTime] = useState(false);
  const [cardioTimeMin, setCardioTimeMin] = useState('');
  const [cardioUseDistance, setCardioUseDistance] = useState(false);
  const [cardioDistance, setCardioDistance] = useState('');
  const [cardioConditionMode, setCardioConditionMode] =
    useState<GoalConditionMode>('and');

  const [proteinEnabled, setProteinEnabled] = useState(false);
  const [proteinTarget, setProteinTarget] = useState('');
  const [carbsEnabled, setCarbsEnabled] = useState(false);
  const [carbsTarget, setCarbsTarget] = useState('');
  const [fatsEnabled, setFatsEnabled] = useState(false);
  const [fatsTarget, setFatsTarget] = useState('');
  const [nutritionConditionMode, setNutritionConditionMode] =
    useState<GoalConditionMode>('and');

  const [calorieMode, setCalorieMode] = useState<CalorieGoalMode>('disabled');
  const [calorieTarget, setCalorieTarget] = useState('');

  useEffect(() => {
    let mounted = true;

    const loadLatestGoals = async () => {
      try {
        setLoading(true);

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) return;

        const { data, error } = await supabase
          .schema('user')
          .from('user_goal_snapshots')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (error) {
          console.error('Error loading goals', error);
          return;
        }

        if (!mounted || !data?.length) return;

        const g = data[0] as any;
        const storedStrengthUnit = g.strength_volume_unit === 'lb' ? 'lb' : 'kg';
        const storedDistanceUnit = g.cardio_distance_unit === 'mi' ? 'mi' : 'km';

        setStrengthConditionMode(
          g.strength_condition_mode === 'or' ? 'or' : 'and'
        );
        setStrengthUseTime(g.strength_use_time ?? false);
        setStrengthTimeMin(
          g.strength_time_min != null ? String(g.strength_time_min) : ''
        );
        setStrengthUseVolume(g.strength_use_volume ?? false);
        setStrengthVolumeMin(
          g.strength_volume_min != null
            ? String(
                Math.round(
                  convertWeight(
                    Number(g.strength_volume_min),
                    storedStrengthUnit,
                    weightUnit
                  )
                )
              )
            : ''
        );

        setCardioConditionMode(
          g.cardio_condition_mode === 'or' ? 'or' : 'and'
        );
        setCardioUseTime(g.cardio_use_time ?? false);
        setCardioTimeMin(
          g.cardio_time_min != null ? String(g.cardio_time_min) : ''
        );
        setCardioUseDistance(g.cardio_use_distance ?? false);
        setCardioDistance(
          g.cardio_distance != null
            ? String(
                Number(
                  convertDistance(
                    Number(g.cardio_distance),
                    storedDistanceUnit,
                    distanceUnit
                  ).toFixed(2)
                )
              )
            : ''
        );

        setNutritionConditionMode(
          g.nutrition_condition_mode === 'or' ? 'or' : 'and'
        );
        setProteinEnabled(g.protein_enabled ?? false);
        setProteinTarget(
          g.protein_target_g != null ? String(g.protein_target_g) : ''
        );
        setCarbsEnabled(g.carbs_enabled ?? false);
        setCarbsTarget(
          g.carbs_target_g != null ? String(g.carbs_target_g) : ''
        );
        setFatsEnabled(g.fats_enabled ?? false);
        setFatsTarget(
          g.fats_target_g != null ? String(g.fats_target_g) : ''
        );

        setCalorieMode((g.calorie_goal_mode ?? 'disabled') as CalorieGoalMode);
        setCalorieTarget(
          g.calorie_target_kcal != null ? String(g.calorie_target_kcal) : ''
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLatestGoals();

    return () => {
      mounted = false;
    };
  }, [distanceUnit, weightUnit]);

  const intOrNull = (value: string) => {
    const n = parseInt(value.trim(), 10);
    return Number.isFinite(n) ? n : null;
  };

  const floatOrNull = (value: string) => {
    const n = parseFloat(value.trim());
    return Number.isFinite(n) ? n : null;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        Alert.alert('Error', 'You must be logged in to save goals.');
        return;
      }

      const payload = {
        user_id: user.id,
        strength_condition_mode: strengthConditionMode,
        strength_use_time: strengthUseTime,
        strength_time_min: strengthUseTime ? intOrNull(strengthTimeMin) : null,
        strength_use_volume: strengthUseVolume,
        strength_volume_min: strengthUseVolume ? intOrNull(strengthVolumeMin) : null,
        strength_volume_unit: weightUnit,

        cardio_condition_mode: cardioConditionMode,
        cardio_use_time: cardioUseTime,
        cardio_time_min: cardioUseTime ? intOrNull(cardioTimeMin) : null,
        cardio_use_distance: cardioUseDistance,
        cardio_distance: cardioUseDistance ? floatOrNull(cardioDistance) : null,
        cardio_distance_unit: distanceUnit,

        nutrition_condition_mode: nutritionConditionMode,
        protein_enabled: proteinEnabled,
        protein_target_g: proteinEnabled ? intOrNull(proteinTarget) : null,
        carbs_enabled: carbsEnabled,
        carbs_target_g: carbsEnabled ? intOrNull(carbsTarget) : null,
        fats_enabled: fatsEnabled,
        fats_target_g: fatsEnabled ? intOrNull(fatsTarget) : null,

        calorie_goal_mode: calorieMode,
        calorie_target_kcal:
          calorieMode === 'disabled' ? null : intOrNull(calorieTarget),
      };

      const { error } = await supabase
        .schema('user')
        .from('user_goal_snapshots')
        .insert([payload]);

      if (error) {
        console.error(error);
        Alert.alert('Error', error.message);
        return;
      }

      try {
        await syncAndFetchMyDailyGoalResult(toLocalISODate(new Date()));
      } catch (goalRefreshError) {
        console.warn('[GoalSettings] goal refresh failed', goalRefreshError);
      }

      Alert.alert('Goals saved', 'Your goals have been updated.');
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={TEXT_PRIMARY} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Goal settings</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : (
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Strength goals</Text>
            <View style={styles.card}>
              <Text style={styles.helperText}>
                Choose whether all enabled checks are required or whether one
                completed check is enough for your strength goal.
              </Text>

              <View style={styles.divider} />
              <ConditionModeRow
                value={strengthConditionMode}
                onChange={setStrengthConditionMode}
              />

              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowLabelCol}>
                  <Text style={styles.rowLabel}>Time threshold</Text>
                  <Text style={styles.rowSubLabel}>Minutes of lifting</Text>
                </View>
                <View style={styles.rowControlCol}>
                  <TextInput
                    style={[styles.input, !strengthUseTime && styles.inputDisabled]}
                    editable={strengthUseTime}
                    keyboardType="numeric"
                    value={strengthTimeMin}
                    onChangeText={setStrengthTimeMin}
                    placeholder="e.g. 45"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  <Switch
                    value={strengthUseTime}
                    onValueChange={setStrengthUseTime}
                  />
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowLabelCol}>
                  <Text style={styles.rowLabel}>Volume threshold</Text>
                  <Text style={styles.rowSubLabel}>
                    Total volume ({weightUnit})
                  </Text>
                </View>
                <View style={styles.rowControlCol}>
                  <TextInput
                    style={[
                      styles.input,
                      !strengthUseVolume && styles.inputDisabled,
                    ]}
                    editable={strengthUseVolume}
                    keyboardType="numeric"
                    value={strengthVolumeMin}
                    onChangeText={setStrengthVolumeMin}
                    placeholder="e.g. 20000"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  <Switch
                    value={strengthUseVolume}
                    onValueChange={setStrengthUseVolume}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cardio goals</Text>
            <View style={styles.card}>
              <Text style={styles.helperText}>
                Choose whether one cardio check is enough or whether all enabled
                cardio checks must be completed.
              </Text>

              <View style={styles.divider} />
              <ConditionModeRow
                value={cardioConditionMode}
                onChange={setCardioConditionMode}
              />

              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowLabelCol}>
                  <Text style={styles.rowLabel}>Distance threshold</Text>
                  <Text style={styles.rowSubLabel}>
                    Daily distance ({distanceUnit})
                  </Text>
                </View>
                <View style={styles.rowControlCol}>
                  <TextInput
                    style={[
                      styles.input,
                      !cardioUseDistance && styles.inputDisabled,
                    ]}
                    editable={cardioUseDistance}
                    keyboardType="numeric"
                    value={cardioDistance}
                    onChangeText={setCardioDistance}
                    placeholder="e.g. 5"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  <Switch
                    value={cardioUseDistance}
                    onValueChange={setCardioUseDistance}
                  />
                </View>
              </View>

              <View style={styles.divider} />
              <View style={styles.row}>
                <View style={styles.rowLabelCol}>
                  <Text style={styles.rowLabel}>Time threshold</Text>
                  <Text style={styles.rowSubLabel}>Minutes of cardio</Text>
                </View>
                <View style={styles.rowControlCol}>
                  <TextInput
                    style={[styles.input, !cardioUseTime && styles.inputDisabled]}
                    editable={cardioUseTime}
                    keyboardType="numeric"
                    value={cardioTimeMin}
                    onChangeText={setCardioTimeMin}
                    placeholder="e.g. 30"
                    placeholderTextColor={TEXT_MUTED}
                  />
                  <Switch
                    value={cardioUseTime}
                    onValueChange={setCardioUseTime}
                  />
                </View>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition – macros</Text>
            <View style={styles.card}>
              <Text style={styles.helperText}>
                Pick whether nutrition completes when any enabled target is met
                or only when every enabled target is met.
              </Text>

              <View style={styles.divider} />
              <ConditionModeRow
                value={nutritionConditionMode}
                onChange={setNutritionConditionMode}
              />

              <View style={styles.divider} />
              <MacroRow
                label="Protein"
                unit="g"
                enabled={proteinEnabled}
                setEnabled={setProteinEnabled}
                value={proteinTarget}
                setValue={setProteinTarget}
                placeholder="e.g. 180"
              />
              <View style={styles.divider} />
              <MacroRow
                label="Carbs"
                unit="g"
                enabled={carbsEnabled}
                setEnabled={setCarbsEnabled}
                value={carbsTarget}
                setValue={setCarbsTarget}
                placeholder="e.g. 250"
              />
              <View style={styles.divider} />
              <MacroRow
                label="Fats"
                unit="g"
                enabled={fatsEnabled}
                setEnabled={setFatsEnabled}
                value={fatsTarget}
                setValue={setFatsTarget}
                placeholder="e.g. 70"
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition – calories</Text>
            <View style={styles.card}>
              <Text style={styles.subSectionLabel}>Goal type</Text>
              <View style={styles.chipRow}>
                <GoalChip
                  label="Disabled"
                  active={calorieMode === 'disabled'}
                  onPress={() => setCalorieMode('disabled')}
                />
                <GoalChip
                  label="Lose weight"
                  active={calorieMode === 'lose'}
                  onPress={() => setCalorieMode('lose')}
                />
              </View>
              <View style={[styles.chipRow, { marginTop: 8 }]}>
                <GoalChip
                  label="Maintain"
                  active={calorieMode === 'maintain'}
                  onPress={() => setCalorieMode('maintain')}
                />
                <GoalChip
                  label="Gain weight"
                  active={calorieMode === 'gain'}
                  onPress={() => setCalorieMode('gain')}
                />
              </View>

              {calorieMode !== 'disabled' && (
                <>
                  <View style={styles.divider} />
                  <View style={styles.row}>
                    <View style={styles.rowLabelCol}>
                      <Text style={styles.rowLabel}>Daily calories</Text>
                      <Text style={styles.rowSubLabel}>Target kcal</Text>
                    </View>
                    <View style={styles.rowControlCol}>
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={calorieTarget}
                        onChangeText={setCalorieTarget}
                        placeholder="e.g. 2500"
                        placeholderTextColor={TEXT_MUTED}
                      />
                    </View>
                  </View>
                </>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator />
            ) : (
              <Text style={styles.saveButtonText}>Save goals</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ConditionModeRow({
  value,
  onChange,
}: {
  value: GoalConditionMode;
  onChange: (next: GoalConditionMode) => void;
}) {
  return (
    <View>
      <Text style={styles.subSectionLabel}>Completion rule</Text>
      <View style={styles.chipRow}>
        <GoalChip
          label="All enabled"
          active={value === 'and'}
          onPress={() => onChange('and')}
        />
        <GoalChip
          label="Any enabled"
          active={value === 'or'}
          onPress={() => onChange('or')}
        />
      </View>
    </View>
  );
}

function GoalChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MacroRow({
  label,
  unit,
  enabled,
  setEnabled,
  value,
  setValue,
  placeholder,
}: {
  label: string;
  unit: string;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  value: string;
  setValue: (v: string) => void;
  placeholder: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowSubLabel}>{unit}</Text>
      </View>
      <View style={styles.rowControlCol}>
        <TextInput
          style={[styles.input, !enabled && styles.inputDisabled]}
          editable={enabled}
          keyboardType="numeric"
          value={value}
          onChangeText={setValue}
          placeholder={placeholder}
          placeholderTextColor={TEXT_MUTED}
        />
        <Switch value={enabled} onValueChange={setEnabled} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: BG,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: BG,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    color: TEXT_PRIMARY,
    fontSize: 18,
    fontWeight: '600',
  },

  container: {
    flex: 1,
    backgroundColor: BG,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
  },

  section: {
    marginTop: 20,
  },
  sectionTitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
  },

  helperText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabelCol: {
    flex: 1.4,
  },
  rowControlCol: {
    flex: 1.6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 8,
  },
  rowLabel: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '500',
  },
  rowSubLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: TEXT_PRIMARY,
    fontSize: 14,
    backgroundColor: '#020617',
  },
  inputDisabled: {
    opacity: 0.4,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginVertical: 10,
  },

  subSectionLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 6,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipActive: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  chipText: {
    color: TEXT_MUTED,
    fontSize: 12,
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  saveButton: {
    marginTop: 24,
    backgroundColor: ACCENT,
    paddingVertical: 12,
    borderRadius: 999,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
