import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import type {
  OutdoorBackgroundTrackingDebugEvent,
  OutdoorBackgroundTrackingDiagnostics,
} from '@/lib/OutdoorSession/backgroundTracking';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  appState: string;
  phase: 'idle' | 'running' | 'paused';
  diagnostics: OutdoorBackgroundTrackingDiagnostics | null;
  events: OutdoorBackgroundTrackingDebugEvent[];
};

function formatEventTime(timestampISO: string) {
  const date = new Date(timestampISO);
  if (Number.isNaN(date.getTime())) {
    return timestampISO;
  }

  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function boolLabel(value: boolean | null | undefined) {
  if (value == null) return 'n/a';
  return value ? 'yes' : 'no';
}

export default function OutdoorTrackingDebugPanel({
  appState,
  phase,
  diagnostics,
  events,
}: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const rows = [
    { label: 'App state', value: appState },
    { label: 'Phase', value: phase },
    { label: 'Permission', value: diagnostics?.backgroundPermissionStatus ?? 'unknown' },
    { label: 'iOS scope', value: diagnostics?.backgroundPermissionScope ?? 'n/a' },
    { label: 'Available', value: boolLabel(diagnostics?.backgroundLocationAvailable) },
    { label: 'Task active', value: boolLabel(diagnostics?.backgroundUpdatesStarted) },
    { label: 'Cached ready', value: boolLabel(diagnostics?.cachedPermissionReady) },
  ];
  const visibleEvents = events.slice(0, 4);

  return (
    <View style={styles.panel}>
      <View style={styles.headerRow}>
        <Text style={styles.eyebrow}>Tracking debug</Text>
        <Text style={styles.headerValue}>
          {diagnostics?.taskManagerAvailable ? 'task manager ready' : 'task manager unavailable'}
        </Text>
      </View>

      <View style={styles.grid}>
        {rows.map((row) => (
          <View key={row.label} style={styles.cell}>
            <Text style={styles.cellLabel}>{row.label}</Text>
            <Text style={styles.cellValue} numberOfLines={2}>
              {row.value}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.errorBlock}>
        <Text style={styles.sectionLabel}>Last start error</Text>
        <Text style={styles.errorText}>
          {diagnostics?.lastStartError ?? 'none'}
        </Text>
      </View>

      <View style={styles.eventsBlock}>
        <Text style={styles.sectionLabel}>Recent events</Text>
        {events.length === 0 ? (
          <Text style={styles.emptyText}>No tracking events recorded yet.</Text>
        ) : (
          visibleEvents.map((event, index) => (
            <View
              key={`${event.timestampISO}-${event.source}-${index}`}
              style={[
                styles.eventRow,
                index < visibleEvents.length - 1 ? styles.eventDivider : null,
              ]}
            >
              <Text style={styles.eventMeta}>
                {formatEventTime(event.timestampISO)} · {event.source}
              </Text>
              <Text style={styles.eventMessage}>{event.message}</Text>
              {event.details ? (
                <Text style={styles.eventDetails} numberOfLines={3}>
                  {event.details}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    panel: {
      width: '100%',
      backgroundColor: colors.card2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      gap: 14,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    eyebrow: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    headerValue: {
      flex: 1,
      textAlign: 'right',
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    cell: {
      minWidth: '30%',
      flexGrow: 1,
      backgroundColor: colors.card3,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cellLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    cellValue: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    sectionLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
      marginBottom: 6,
    },
    errorBlock: {
      backgroundColor: colors.card3,
      borderRadius: 14,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    errorText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    eventsBlock: {
      backgroundColor: colors.card3,
      borderRadius: 14,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    eventRow: {
      paddingVertical: 8,
    },
    eventDivider: {
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    eventMeta: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
      marginBottom: 4,
    },
    eventMessage: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    eventDetails: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
      marginTop: 3,
    },
  });
}
