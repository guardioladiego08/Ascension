import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import { HOME_TONES } from '@/app/(tabs)/home/tokens';
import {
  buildCustomIntervalPlan,
  formatIntervalDuration,
  serializeIntervalPlan,
} from '@/lib/intervals/plans';
import { INTERVAL_PRESETS } from '@/lib/intervals/presets';
import type { IntervalPlan } from '@/lib/intervals/types';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  eyebrow: string;
  title: string;
  subtitle: string;
  backRoute: string;
  sessionRoute: string;
  activityTag: 'indoor' | 'outdoor';
  loadSavedPlans: () => Promise<IntervalPlan[]>;
  savePlanTemplate: (plan: IntervalPlan) => Promise<string>;
};

function secondsFromFields(minutes: string, seconds: string) {
  const mins = Math.max(0, Number.parseInt(minutes || '0', 10) || 0);
  const secs = Math.max(0, Number.parseInt(seconds || '0', 10) || 0);
  return mins * 60 + secs;
}

export default function IntervalSetupScreen({
  eyebrow,
  title,
  subtitle,
  backRoute,
  sessionRoute,
  activityTag,
  loadSavedPlans,
  savePlanTemplate,
}: Props) {
  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [savedPlans, setSavedPlans] = useState<IntervalPlan[]>([]);
  const [loadingSavedPlans, setLoadingSavedPlans] = useState(true);
  const [savingTemplate, setSavingTemplate] = useState(false);

  const [customName, setCustomName] = useState('');
  const [saveCustomTemplate, setSaveCustomTemplate] = useState(false);
  const [warmupMinutes, setWarmupMinutes] = useState('5');
  const [warmupSeconds, setWarmupSeconds] = useState('0');
  const [workMinutes, setWorkMinutes] = useState('1');
  const [workSeconds, setWorkSeconds] = useState('0');
  const [breakMinutes, setBreakMinutes] = useState('1');
  const [breakSeconds, setBreakSeconds] = useState('0');
  const [restMinutes, setRestMinutes] = useState('0');
  const [restSeconds, setRestSeconds] = useState('0');
  const [intervalCount, setIntervalCount] = useState('6');

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const plans = await loadSavedPlans();
        if (mounted) {
          setSavedPlans(plans);
        }
      } catch (error: any) {
        if (mounted) {
          Alert.alert(
            'Could not load saved intervals',
            String(error?.message ?? 'Please try again.')
          );
        }
      } finally {
        if (mounted) {
          setLoadingSavedPlans(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [loadSavedPlans]);

  const customPlan = useMemo(
    () =>
      buildCustomIntervalPlan({
        name: customName.trim() || 'Custom Interval',
        warmupSeconds: secondsFromFields(warmupMinutes, warmupSeconds),
        workSeconds: secondsFromFields(workMinutes, workSeconds),
        recoverySeconds: secondsFromFields(breakMinutes, breakSeconds),
        restSeconds: secondsFromFields(restMinutes, restSeconds),
        intervalCount: Math.max(1, Number.parseInt(intervalCount || '1', 10) || 1),
        activityTag,
      }),
    [
      activityTag,
      breakMinutes,
      breakSeconds,
      customName,
      intervalCount,
      restMinutes,
      restSeconds,
      warmupMinutes,
      warmupSeconds,
      workMinutes,
      workSeconds,
    ]
  );

  async function refreshSavedPlans() {
    setLoadingSavedPlans(true);
    try {
      const plans = await loadSavedPlans();
      setSavedPlans(plans);
    } finally {
      setLoadingSavedPlans(false);
    }
  }

  function buildNamedCustomPlan() {
    return buildCustomIntervalPlan({
      name: customName.trim(),
      warmupSeconds: secondsFromFields(warmupMinutes, warmupSeconds),
      workSeconds: secondsFromFields(workMinutes, workSeconds),
      recoverySeconds: secondsFromFields(breakMinutes, breakSeconds),
      restSeconds: secondsFromFields(restMinutes, restSeconds),
      intervalCount: Math.max(1, Number.parseInt(intervalCount || '1', 10) || 1),
      activityTag,
    });
  }

  async function onSaveCustomTemplate() {
    if (!customName.trim()) {
      Alert.alert('Name required', 'Add a template name before saving this custom interval.');
      return;
    }

    try {
      setSavingTemplate(true);
      await savePlanTemplate(buildNamedCustomPlan());
      await refreshSavedPlans();
      Alert.alert('Saved', 'Your custom interval is now available in saved workouts.');
    } catch (error: any) {
      Alert.alert('Save failed', String(error?.message ?? 'Please try again.'));
    } finally {
      setSavingTemplate(false);
    }
  }

  async function onStartPlan(plan: IntervalPlan) {
    if (plan.steps.length === 0) {
      Alert.alert('Invalid interval', 'Add at least one step before starting.');
      return;
    }

    if (saveCustomTemplate && customName.trim() && plan.source === 'custom') {
      try {
        setSavingTemplate(true);
        const savedId = await savePlanTemplate(buildNamedCustomPlan());
        plan = { ...plan, templateId: savedId };
        await refreshSavedPlans();
      } catch (error: any) {
        Alert.alert(
          'Template save failed',
          `${String(error?.message ?? 'Please try again.')}\n\nYou can still start without saving.`
        );
      } finally {
        setSavingTemplate(false);
      }
    }

    router.push({
      pathname: sessionRoute as never,
      params: {
        title: plan.name,
        planPayload: serializeIntervalPlan(plan),
      },
    });
  }

  return (
    <View style={styles.page}>
      <View style={[globalStyles.container, styles.safe]}>
        <LogoHeader />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.iconButton}
              onPress={() => goBackSmart({ fallbackHref: backRoute })}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>{eyebrow}</Text>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader
            title="Preset intervals"
            subtitle="Best-practice sessions adapted from Nike, Runner’s World, REI, and Verywell Fit."
            styles={styles}
          />

          {INTERVAL_PRESETS.map((plan) => (
            <IntervalPlanCard
              key={plan.id}
              plan={plan}
              actionLabel="Start preset"
              styles={styles}
              onPress={() => {
                void onStartPlan(plan);
              }}
            />
          ))}

          <SectionHeader
            title="Saved intervals"
            subtitle="Your reusable custom interval templates."
            styles={styles}
          />

          {loadingSavedPlans ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={colors.highlight1} />
              <Text style={styles.loadingText}>Loading saved templates…</Text>
            </View>
          ) : savedPlans.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No saved interval templates yet</Text>
              <Text style={styles.emptyBody}>
                Save a custom setup below and it will show up here for one-tap reuse.
              </Text>
            </View>
          ) : (
            savedPlans.map((plan) => (
              <IntervalPlanCard
                key={plan.id}
                plan={plan}
                actionLabel="Start saved"
                styles={styles}
                onPress={() => {
                  void onStartPlan(plan);
                }}
              />
            ))
          )}

          <SectionHeader
            title="Custom builder"
            subtitle="Define the timing once, then save it with a name if you want it later."
            styles={styles}
          />

          <View style={styles.builderCard}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Template name</Text>
              <TextInput
                value={customName}
                onChangeText={setCustomName}
                placeholder="Morning speed set"
                placeholderTextColor={HOME_TONES.textTertiary}
                style={styles.nameInput}
              />
            </View>

            <DurationRow
              label="Warm-up"
              description="Easy prep before the first hard effort."
              minuteValue={warmupMinutes}
              secondValue={warmupSeconds}
              onChangeMinutes={setWarmupMinutes}
              onChangeSeconds={setWarmupSeconds}
              styles={styles}
            />
            <DurationRow
              label="High intensity"
              description="The hard running segment in each repeat."
              minuteValue={workMinutes}
              secondValue={workSeconds}
              onChangeMinutes={setWorkMinutes}
              onChangeSeconds={setWorkSeconds}
              styles={styles}
            />
            <DurationRow
              label="Break"
              description="Active recovery right after each hard rep."
              minuteValue={breakMinutes}
              secondValue={breakSeconds}
              onChangeMinutes={setBreakMinutes}
              onChangeSeconds={setBreakSeconds}
              styles={styles}
            />
            <DurationRow
              label="Rest"
              description="Optional extra reset between repeats."
              minuteValue={restMinutes}
              secondValue={restSeconds}
              onChangeMinutes={setRestMinutes}
              onChangeSeconds={setRestSeconds}
              styles={styles}
            />

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Number of intervals</Text>
              <TextInput
                value={intervalCount}
                onChangeText={setIntervalCount}
                keyboardType="number-pad"
                placeholder="6"
                placeholderTextColor={HOME_TONES.textTertiary}
                style={styles.countInput}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.switchTitle}>Save this template when I start</Text>
                <Text style={styles.switchDetail}>
                  Use this if you want the custom setup to appear in saved intervals automatically.
                </Text>
              </View>
              <Switch value={saveCustomTemplate} onValueChange={setSaveCustomTemplate} />
            </View>

            <View style={styles.previewCard}>
              <Text style={styles.previewLabel}>Preview</Text>
              <Text style={styles.previewTitle}>{customPlan.name}</Text>
              <Text style={styles.previewBody}>{customPlan.description}</Text>
              <Text style={styles.previewMeta}>
                {customPlan.steps.length} phases •{' '}
                {formatIntervalDuration(
                  customPlan.steps.reduce((sum, step) => sum + step.durationSeconds, 0)
                )}
              </Text>
            </View>

            <View style={styles.builderActions}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.secondaryButton}
                onPress={() => {
                  void onSaveCustomTemplate();
                }}
                disabled={savingTemplate}
              >
                <Ionicons name="bookmark-outline" size={16} color={colors.text} />
                <Text style={styles.secondaryButtonText}>
                  {savingTemplate ? 'Saving…' : 'Save template'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.92}
                style={styles.primaryButton}
                onPress={() => {
                  void onStartPlan(customPlan);
                }}
              >
                <Ionicons name="play" size={16} color={colors.blkText} />
                <Text style={styles.primaryButtonText}>Start custom session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  styles,
}: {
  title: string;
  subtitle: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSubtitle}>{subtitle}</Text>
    </View>
  );
}

function IntervalPlanCard({
  plan,
  actionLabel,
  styles,
  onPress,
}: {
  plan: IntervalPlan;
  actionLabel: string;
  styles: ReturnType<typeof createStyles>;
  onPress: () => void;
}) {
  const totalSeconds = plan.steps.reduce((sum, step) => sum + step.durationSeconds, 0);

  return (
    <View style={styles.planCard}>
      <View style={styles.planHeader}>
        <View style={styles.planHeaderCopy}>
          <Text style={styles.planTitle}>{plan.name}</Text>
          <Text style={styles.planBody}>{plan.description}</Text>
        </View>
        <View style={styles.planDurationPill}>
          <Text style={styles.planDurationText}>{formatIntervalDuration(totalSeconds)}</Text>
        </View>
      </View>

      <Text style={styles.planBenefit}>{plan.benefit}</Text>
      <Text style={styles.planMeta}>
        {plan.steps.length} phases{plan.originLabel ? ` • ${plan.originLabel}` : ''}
      </Text>

      <TouchableOpacity activeOpacity={0.92} style={styles.planAction} onPress={onPress}>
        <Text style={styles.planActionText}>{actionLabel}</Text>
        <Ionicons name="arrow-forward" size={16} color={styles.planActionText.color} />
      </TouchableOpacity>
    </View>
  );
}

function DurationRow({
  label,
  description,
  minuteValue,
  secondValue,
  onChangeMinutes,
  onChangeSeconds,
  styles,
}: {
  label: string;
  description: string;
  minuteValue: string;
  secondValue: string;
  onChangeMinutes: (value: string) => void;
  onChangeSeconds: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <View style={styles.durationRow}>
      <View style={styles.durationCopy}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.durationDescription}>{description}</Text>
      </View>
      <View style={styles.durationInputs}>
        <View style={styles.durationField}>
          <TextInput
            value={minuteValue}
            onChangeText={onChangeMinutes}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={HOME_TONES.textTertiary}
            style={styles.durationInput}
          />
          <Text style={styles.durationSuffix}>min</Text>
        </View>
        <View style={styles.durationField}>
          <TextInput
            value={secondValue}
            onChangeText={onChangeSeconds}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={HOME_TONES.textTertiary}
            style={styles.durationInput}
          />
          <Text style={styles.durationSuffix}>sec</Text>
        </View>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    safe: {
      flex: 1,
    },
    heroCard: {
      marginTop: 8,
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 20,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: {
      flex: 1,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: 8,
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 300,
    },
    scroll: {
      flex: 1,
      marginTop: 14,
    },
    scrollContent: {
      paddingBottom: 20,
      gap: 12,
    },
    sectionHeader: {
      paddingTop: 6,
    },
    sectionTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    sectionSubtitle: {
      marginTop: 4,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    planCard: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 16,
      gap: 10,
    },
    planHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    planHeaderCopy: {
      flex: 1,
    },
    planTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    planBody: {
      marginTop: 5,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    planBenefit: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
    },
    planMeta: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 16,
    },
    planDurationPill: {
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    planDurationText: {
      color: colors.highlight1,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 14,
    },
    planAction: {
      marginTop: 2,
      minHeight: 46,
      borderRadius: 16,
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    planActionText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    loadingCard: {
      minHeight: 88,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    loadingText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    emptyCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 16,
    },
    emptyTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    emptyBody: {
      marginTop: 6,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    builderCard: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 16,
      gap: 14,
    },
    inputGroup: {
      gap: 8,
    },
    inputLabel: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    nameInput: {
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    countInput: {
      minHeight: 48,
      maxWidth: 120,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    durationRow: {
      gap: 10,
    },
    durationCopy: {
      gap: 4,
    },
    durationDescription: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    durationInputs: {
      flexDirection: 'row',
      gap: 10,
    },
    durationField: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    durationInput: {
      flex: 1,
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.body,
      fontSize: 14,
      paddingVertical: 0,
    },
    durationSuffix: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      textTransform: 'uppercase',
    },
    switchRow: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    switchCopy: {
      flex: 1,
    },
    switchTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    switchDetail: {
      marginTop: 4,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    previewCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      padding: 14,
      gap: 6,
    },
    previewLabel: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    previewTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    previewBody: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
    previewMeta: {
      color: colors.highlight1,
      fontFamily: fonts.mono,
      fontSize: 12,
      lineHeight: 16,
    },
    builderActions: {
      flexDirection: 'row',
      gap: 10,
    },
    secondaryButton: {
      flex: 1,
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    secondaryButtonText: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
    primaryButton: {
      flex: 1.2,
      minHeight: 48,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.highlight1,
      backgroundColor: colors.highlight1,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    primaryButtonText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 13,
      lineHeight: 17,
    },
  });
}
