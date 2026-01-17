import React, { useMemo } from 'react';
import { SafeAreaView, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';
import { formatDuration, formatKm, formatPace, paceSecPerKm } from '@/lib/OutdoorSession/outdoorUtils';

const BG = Colors?.dark?.background ?? '#F5F6F8';
const TEXT = Colors?.dark?.text ?? '#111';
const MUTED = Colors?.dark?.textMuted ?? '#6B7280';
const ACCENT = Colors?.dark?.highlight1 ?? '#16A34A';

export default function SessionSummary() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    activityType?: string;
    elapsedSeconds?: string;
    distanceMeters?: string;
  }>();

  const title = (params.title ?? 'Outdoor Session').toString();
  const activityType = (params.activityType ?? 'run').toString();
  const elapsedSeconds = Number(params.elapsedSeconds ?? 0);
  const distanceMeters = Number(params.distanceMeters ?? 0);

  const avgPace = useMemo(
    () => paceSecPerKm(distanceMeters, elapsedSeconds),
    [distanceMeters, elapsedSeconds]
  );

  function done() {
    // TODO later: persist to backend here (when you revisit)
    router.replace('/(tabs)/home');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Text style={styles.kicker}>SESSION SUMMARY</Text>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub}>{activityType.toUpperCase()}</Text>
      </View>

      <View style={styles.card}>
        <Row label="Time" value={formatDuration(elapsedSeconds)} />
        <Row label="Distance" value={`${formatKm(distanceMeters)} km`} />
        <Row label="Avg Pace" value={formatPace(avgPace)} />
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primary} onPress={done}>
          <Ionicons name="checkmark" size={20} color="#fff" />
          <Text style={styles.primaryText}>Done</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          This is front-end only for now. When you’re ready, we’ll wire persistence + history.
        </Text>
      </View>

      <View style={[styles.accentLine, { backgroundColor: ACCENT }]} />
    </SafeAreaView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={rowStyles.row}>
      <Text style={rowStyles.label}>{label}</Text>
      <Text style={rowStyles.value}>{value}</Text>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 14 },
  label: { color: '#6B7280', fontWeight: '800', letterSpacing: 1.2, fontSize: 12 },
  value: { color: '#111', fontWeight: '900', fontSize: 16 },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 10 },
  kicker: { color: MUTED, fontWeight: '900', letterSpacing: 1.6, fontSize: 12 },
  title: { marginTop: 8, color: TEXT, fontWeight: '900', fontSize: 28 },
  sub: { marginTop: 4, color: MUTED, fontWeight: '800', letterSpacing: 1.4, fontSize: 12 },

  card: {
    marginTop: 12,
    marginHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },

  footer: { marginTop: 'auto', paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  primary: {
    height: 56,
    borderRadius: 16,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  note: { color: MUTED, fontSize: 12, fontWeight: '700', lineHeight: 18 },

  accentLine: { height: 4, width: '100%' },
});
