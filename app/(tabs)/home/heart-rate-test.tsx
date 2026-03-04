import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import { Colors } from '@/constants/Colors';
import {
  getAppleHeartRateSamplesForRange,
  getAppleHealthUnavailableMessage,
  isAppleHealthKitAvailable,
  type AppleHeartRateSample,
} from '@/lib/health/appleHealthKit';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const BORDER = Colors.dark?.border ?? '#1F2937';
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const ACCENT = Colors.dark.highlight1;

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatWindowDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

export default function HeartRateTestScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [samples, setSamples] = useState<AppleHeartRateSample[]>([]);
  const [windowStart, setWindowStart] = useState<string | null>(null);
  const [windowEnd, setWindowEnd] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  const averageBpm = useMemo(() => {
    if (samples.length === 0) return null;
    const total = samples.reduce((sum, sample) => sum + sample.bpm, 0);
    return Math.round((total / samples.length) * 10) / 10;
  }, [samples]);

  const loadLastThreeHours = async () => {
    const end = new Date();
    const start = new Date(end.getTime() - 3 * 60 * 60 * 1000);

    setWindowStart(start.toISOString());
    setWindowEnd(end.toISOString());
    setLoading(true);
    setErrorText(null);

    try {
      if (!isAppleHealthKitAvailable()) {
        throw new Error(getAppleHealthUnavailableMessage());
      }

      const nextSamples = await getAppleHeartRateSamplesForRange({
        startDate: start.toISOString(),
        endDate: end.toISOString(),
      });

      setSamples(nextSamples);
    } catch (error: any) {
      setSamples([]);
      setErrorText(error?.message ?? 'Failed to load heart-rate samples.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.screen}
    >
      <SafeAreaView style={styles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.header}>
          <Text style={styles.title}>Heart Rate Test</Text>
          <Text style={styles.subtitle}>
            Query Apple Health for the last 3 hours and inspect the raw samples.
          </Text>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Query</Text>
            <Text style={styles.cardBody}>
              This is a temporary debug tool. It does not save anything by itself. It only reads
              the samples that Apple Health already has.
            </Text>

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              disabled={loading}
              onPress={loadLastThreeHours}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#081018" />
              ) : (
                <>
                  <Ionicons name="pulse-outline" size={18} color="#081018" />
                  <Text style={styles.buttonText}>Load Last 3 Hours</Text>
                </>
              )}
            </TouchableOpacity>

            {windowStart && windowEnd ? (
              <View style={styles.windowWrap}>
                <Text style={styles.windowLabel}>Window start</Text>
                <Text style={styles.windowValue}>{formatWindowDate(windowStart)}</Text>
                <Text style={styles.windowLabel}>Window end</Text>
                <Text style={styles.windowValue}>{formatWindowDate(windowEnd)}</Text>
              </View>
            ) : null}

            {errorText ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorText}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Results</Text>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Samples</Text>
              <Text style={styles.resultValue}>{samples.length}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Average BPM</Text>
              <Text style={styles.resultValue}>
                {averageBpm == null ? '—' : `${averageBpm} BPM`}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>First sample</Text>
              <Text style={styles.resultValue}>
                {samples[0] ? formatDateTime(samples[0].sampleStartAt) : '—'}
              </Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.resultLabel}>Last sample</Text>
              <Text style={styles.resultValue}>
                {samples.length > 0
                  ? formatDateTime(samples[samples.length - 1].sampleEndAt)
                  : '—'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Raw Samples</Text>
            {samples.length === 0 ? (
              <Text style={styles.emptyText}>No samples loaded yet.</Text>
            ) : (
              samples.map((sample, index) => (
                <View
                  key={`${sample.sampleUuid ?? 'sample'}-${index}`}
                  style={[
                    styles.sampleRow,
                    index < samples.length - 1 ? styles.sampleRowBorder : null,
                  ]}
                >
                  <View style={styles.sampleLeft}>
                    <Text style={styles.sampleBpm}>{Math.round(sample.bpm)} BPM</Text>
                    <Text style={styles.sampleMeta}>
                      {formatDateTime(sample.sampleStartAt)} to {formatDateTime(sample.sampleEndAt)}
                    </Text>
                  </View>
                  <View style={styles.sampleRight}>
                    <Text style={styles.sampleSource}>
                      {sample.sourceName ?? sample.deviceName ?? 'Apple Health'}
                    </Text>
                    {sample.deviceModel ? (
                      <Text style={styles.sampleMeta}>{sample.deviceModel}</Text>
                    ) : null}
                  </View>
                </View>
              ))
            )}
          </View>

          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
            <Text style={styles.secondaryButtonText}>Back to Home</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    color: TEXT_PRIMARY,
    fontSize: 30,
    fontWeight: '800',
  },
  subtitle: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 36,
    gap: 14,
  },
  card: {
    backgroundColor: CARD,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    gap: 12,
  },
  cardTitle: {
    color: TEXT_PRIMARY,
    fontSize: 16,
    fontWeight: '700',
  },
  cardBody: {
    color: TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#081018',
    fontSize: 14,
    fontWeight: '700',
  },
  windowWrap: {
    gap: 4,
  },
  windowLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  windowValue: {
    color: TEXT_PRIMARY,
    fontSize: 13,
  },
  errorBox: {
    borderRadius: 14,
    backgroundColor: 'rgba(248,113,113,0.12)',
    padding: 12,
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
    lineHeight: 18,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultLabel: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  resultValue: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyText: {
    color: TEXT_MUTED,
    fontSize: 14,
  },
  sampleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 10,
  },
  sampleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sampleLeft: {
    flex: 1,
    gap: 4,
  },
  sampleRight: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  sampleBpm: {
    color: TEXT_PRIMARY,
    fontSize: 15,
    fontWeight: '700',
  },
  sampleSource: {
    color: TEXT_PRIMARY,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'right',
  },
  sampleMeta: {
    color: TEXT_MUTED,
    fontSize: 12,
    textAlign: 'right',
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: ACCENT,
    fontSize: 14,
    fontWeight: '700',
  },
});
