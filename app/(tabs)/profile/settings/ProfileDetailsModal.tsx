import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { supabase } from '@/lib/supabase';
import { useUnits } from '@/contexts/UnitsContext';
import type {
  AppUsageReason,
  DbGender,
  JourneyStage,
} from '@/lib/onboarding/onboardingDraftStore';

const BG = 'rgba(0,0,0,0.6)';
const CARD = Colors.dark?.card ?? '#13182B';
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark?.text ?? '#EAF2FF';
const TEXT_MUTED = Colors.dark?.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark?.highlight1 ?? '#6366F1';
const DANGER = '#F87171';

const KG_PER_LB = 0.45359237;

type Props = {
  visible: boolean;
  onClose: () => void;
};

type UserDetailsRow = {
  first_name: string | null;
  last_name: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  DOB: string | null;
  height_cm: string | number | null;
  weight_kg: string | number | null;
  gender: DbGender | null;
  app_usage_reason: AppUsageReason | null;
  app_usage_reasons: AppUsageReason[] | null;
  fitness_journey_stage: JourneyStage | null;
};

const GENDER_OPTIONS: Array<{ key: DbGender; label: string }> = [
  { key: 'female', label: 'Female' },
  { key: 'male', label: 'Male' },
  { key: 'non_binary', label: 'Non-binary' },
  { key: 'prefer_not', label: 'Prefer not to say' },
];

const REASON_OPTIONS: Array<{ key: AppUsageReason; label: string }> = [
  { key: 'track_fitness_health', label: 'Track fitness & health' },
  { key: 'train_for_personal_goal', label: 'Train for a goal' },
  { key: 'compete_with_friends', label: 'Compete with friends' },
  { key: 'connect_with_friends', label: 'Connect with friends' },
  { key: 'other', label: 'Other' },
];

const JOURNEY_OPTIONS: Array<{ key: JourneyStage; label: string }> = [
  { key: 'beginner', label: 'Beginner' },
  { key: 'returning_from_break', label: 'Returning from break' },
  { key: 'intermediate', label: 'Intermediate' },
  { key: 'advanced', label: 'Advanced' },
  { key: 'elite', label: 'Elite' },
];

function trimOrNull(value: string): string | null {
  const next = value.trim();
  return next.length > 0 ? next : null;
}

function parseNumberOrNull(value: string): number | null {
  const n = parseFloat(value.trim());
  return Number.isFinite(n) ? n : null;
}

function formatNumberInput(value: string | number | null | undefined): string {
  if (value == null) return '';
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return String(Math.round(n * 10) / 10);
}

function validIsoDateOrNull(value: string): string | null {
  const v = value.trim();
  if (!v) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

const ProfileDetailsModal: React.FC<Props> = ({ visible, onClose }) => {
  const { weightUnit } = useUnits();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [country, setCountry] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [city, setCity] = useState('');
  const [dob, setDob] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [weightDisplay, setWeightDisplay] = useState('');
  const [gender, setGender] = useState<DbGender | null>(null);
  const [appUsageReason, setAppUsageReason] = useState<AppUsageReason | null>(null);
  const [appUsageReasons, setAppUsageReasons] = useState<AppUsageReason[]>([]);
  const [journeyStage, setJourneyStage] = useState<JourneyStage | null>(null);

  const weightLabel = useMemo(
    () => (weightUnit === 'lb' ? 'Weight (lb)' : 'Weight (kg)'),
    [weightUnit]
  );

  const setFromRow = useCallback(
    (row: UserDetailsRow | null) => {
      setFirstName(row?.first_name ?? '');
      setLastName(row?.last_name ?? '');
      setCountry(row?.country ?? '');
      setStateValue(row?.state ?? '');
      setCity(row?.city ?? '');
      setDob(row?.DOB ?? '');
      setHeightCm(formatNumberInput(row?.height_cm ?? null));

      const weightKg = row?.weight_kg == null ? null : Number(row.weight_kg);
      const displayWeight =
        weightKg == null || !Number.isFinite(weightKg)
          ? ''
          : formatNumberInput(weightUnit === 'lb' ? weightKg / KG_PER_LB : weightKg);
      setWeightDisplay(displayWeight);

      setGender(row?.gender ?? null);
      setAppUsageReason(row?.app_usage_reason ?? null);
      setAppUsageReasons(Array.isArray(row?.app_usage_reasons) ? row.app_usage_reasons : []);
      setJourneyStage(row?.fitness_journey_stage ?? null);
    },
    [weightUnit]
  );

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setErrorText(null);

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error('Not signed in');

      const { data, error } = await supabase
        .schema('user')
        .from('users')
        .select(
          'first_name,last_name,country,state,city,DOB,height_cm,weight_kg,gender,app_usage_reason,app_usage_reasons,fitness_journey_stage'
        )
        .eq('user_id', user.id)
        .maybeSingle<UserDetailsRow>();

      if (error) throw error;
      setFromRow(data ?? null);
    } catch (err: any) {
      console.error('[ProfileDetailsModal] load failed', err);
      setErrorText(err?.message ?? 'Failed to load settings');
      setFromRow(null);
    } finally {
      setLoading(false);
    }
  }, [setFromRow]);

  useEffect(() => {
    if (!visible) {
      setErrorText(null);
      return;
    }
    loadSettings();
  }, [visible, loadSettings]);

  const toggleUsageReason = (reason: AppUsageReason) => {
    setAppUsageReasons((prev) =>
      prev.includes(reason) ? prev.filter((x) => x !== reason) : [...prev, reason]
    );
  };

  const handleSave = async () => {
    const normalizedDob = validIsoDateOrNull(dob);
    if (dob.trim().length > 0 && !normalizedDob) {
      Alert.alert('Invalid date', 'Use YYYY-MM-DD format for date of birth.');
      return;
    }

    const heightValue = parseNumberOrNull(heightCm);
    const weightTyped = parseNumberOrNull(weightDisplay);
    const weightKg =
      weightTyped == null ? null : weightUnit === 'lb' ? weightTyped * KG_PER_LB : weightTyped;

    const uniqueReasons = Array.from(
      new Set<AppUsageReason>([
        ...appUsageReasons,
        ...(appUsageReason ? [appUsageReason] : []),
      ])
    );

    try {
      setSaving(true);
      setErrorText(null);

      const {
        data: { user },
        error: authErr,
      } = await supabase.auth.getUser();
      if (authErr) throw authErr;
      if (!user) throw new Error('Not signed in');

      const payload = {
        user_id: user.id,
        first_name: trimOrNull(firstName),
        last_name: trimOrNull(lastName),
        country: trimOrNull(country),
        state: trimOrNull(stateValue),
        city: trimOrNull(city),
        DOB: normalizedDob,
        height_cm: heightValue,
        weight_kg: weightKg,
        gender,
        app_usage_reason: appUsageReason,
        app_usage_reasons: uniqueReasons,
        fitness_journey_stage: journeyStage,
      };

      const { error } = await supabase
        .schema('user')
        .from('users')
        .upsert(payload, { onConflict: 'user_id' });

      if (error) throw error;

      Alert.alert('Saved', 'Your profile details were updated.');
      onClose();
    } catch (err: any) {
      console.error('[ProfileDetailsModal] save failed', err);
      setErrorText(err?.message ?? 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <Pressable style={styles.overlay} onPress={saving ? undefined : onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.title}>Profile details</Text>
            <TouchableOpacity disabled={saving} onPress={onClose} style={styles.closeIcon}>
              <Ionicons name="close" size={20} color={TEXT_MUTED} />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtitle}>
            Edit your personal and fitness profile information.
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="small" color={ACCENT} />
            </View>
          ) : (
            <ScrollView
              style={styles.content}
              contentContainerStyle={styles.contentInner}
              showsVerticalScrollIndicator={false}
            >
              <SectionLabel label="Personal" />
              <Field label="First name" value={firstName} onChangeText={setFirstName} />
              <Field label="Last name" value={lastName} onChangeText={setLastName} />
              <Field label="DOB (YYYY-MM-DD)" value={dob} onChangeText={setDob} />

              <SectionLabel label="Location" />
              <Field label="Country" value={country} onChangeText={setCountry} />
              <Field label="State" value={stateValue} onChangeText={setStateValue} />
              <Field label="City" value={city} onChangeText={setCity} />

              <SectionLabel label="Body" />
              <Field
                label="Height (cm)"
                value={heightCm}
                onChangeText={setHeightCm}
                keyboardType="decimal-pad"
              />
              <Field
                label={weightLabel}
                value={weightDisplay}
                onChangeText={setWeightDisplay}
                keyboardType="decimal-pad"
              />

              <SectionLabel label="Gender" />
              <ChipRow>
                {GENDER_OPTIONS.map((opt) => (
                  <ChoiceChip
                    key={opt.key}
                    label={opt.label}
                    active={gender === opt.key}
                    onPress={() => setGender(gender === opt.key ? null : opt.key)}
                  />
                ))}
              </ChipRow>

              <SectionLabel label="Primary app reason" />
              <ChipRow>
                {REASON_OPTIONS.map((opt) => (
                  <ChoiceChip
                    key={opt.key}
                    label={opt.label}
                    active={appUsageReason === opt.key}
                    onPress={() =>
                      setAppUsageReason(appUsageReason === opt.key ? null : opt.key)
                    }
                  />
                ))}
              </ChipRow>

              <SectionLabel label="App usage reasons (multi-select)" />
              <ChipRow>
                {REASON_OPTIONS.map((opt) => (
                  <ChoiceChip
                    key={`${opt.key}-multi`}
                    label={opt.label}
                    active={appUsageReasons.includes(opt.key)}
                    onPress={() => toggleUsageReason(opt.key)}
                  />
                ))}
              </ChipRow>

              <SectionLabel label="Fitness journey stage" />
              <ChipRow>
                {JOURNEY_OPTIONS.map((opt) => (
                  <ChoiceChip
                    key={opt.key}
                    label={opt.label}
                    active={journeyStage === opt.key}
                    onPress={() =>
                      setJourneyStage(journeyStage === opt.key ? null : opt.key)
                    }
                  />
                ))}
              </ChipRow>
            </ScrollView>
          )}

          {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.buttonDisabled]}
              onPress={handleSave}
              disabled={saving || loading}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

function SectionLabel({ label }: { label: string }) {
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType = 'default',
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  keyboardType?: 'default' | 'decimal-pad';
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        style={styles.input}
        placeholder={label}
        placeholderTextColor={TEXT_MUTED}
      />
    </View>
  );
}

function ChipRow({ children }: { children: React.ReactNode }) {
  return <View style={styles.chipRow}>{children}</View>;
}

function ChoiceChip({
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
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default ProfileDetailsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: BG,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxHeight: '92%',
    borderRadius: 16,
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  loadingWrap: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 0,
  },
  contentInner: {
    paddingBottom: 4,
  },
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 8,
    marginBottom: 6,
  },
  fieldWrap: {
    marginBottom: 8,
  },
  fieldLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#111827',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: BORDER,
    color: TEXT_PRIMARY,
    fontSize: 14,
    paddingVertical: 9,
    paddingHorizontal: 10,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  chip: {
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderWidth: 1,
    marginRight: 8,
    marginBottom: 8,
  },
  chipActive: {
    borderColor: ACCENT,
    backgroundColor: '#1E293B',
  },
  chipInactive: {
    borderColor: BORDER,
    backgroundColor: '#111827',
  },
  chipText: {
    fontSize: 12,
  },
  chipTextActive: {
    color: ACCENT,
    fontWeight: '600',
  },
  chipTextInactive: {
    color: TEXT_PRIMARY,
  },
  errorText: {
    color: DANGER,
    fontSize: 12,
    marginTop: 4,
  },
  actions: {
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  cancelButton: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
  },
  cancelText: {
    color: TEXT_MUTED,
    fontSize: 13,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: ACCENT,
    borderRadius: 999,
    minWidth: 84,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  saveText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
