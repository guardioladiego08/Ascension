import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors } from '@/constants/Colors';

const PRIMARY = Colors.dark.highlight1;
const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';
const TEXT = Colors.dark.text;

function Btn({
  label,
  onPress,
  tone = 'card',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'card' | 'danger';
  disabled?: boolean;
}) {
  const bg =
    tone === 'primary' ? PRIMARY : tone === 'danger' ? '#B91C1C' : CARD;

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.btn,
        { backgroundColor: bg, borderColor: tone === 'primary' ? 'transparent' : BORDER },
        disabled && { opacity: 0.5 },
      ]}
      disabled={disabled}
      onPress={onPress}
    >
      <Text style={[styles.btnText, { color: tone === 'primary' ? '#0E151F' : TEXT }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function RecorderControls({
  status,
  onStart,
  onPause,
  onResume,
  onLap,
  onFinish,
  onCancel,
}: {
  status: 'idle' | 'recording' | 'paused' | 'saving';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onLap: () => void;
  onFinish: () => void;
  onCancel: () => void;
}) {
  if (status === 'idle') {
    return (
      <View style={styles.row}>
        <Btn tone="primary" label="Start" onPress={onStart} />
      </View>
    );
  }

  if (status === 'saving') {
    return (
      <View style={styles.row}>
        <Btn label="Saving..." onPress={() => {}} disabled />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {status === 'recording' ? (
          <Btn label="Pause" onPress={onPause} />
        ) : (
          <Btn tone="primary" label="Resume" onPress={onResume} />
        )}
        <Btn label="Lap" onPress={onLap} disabled={status !== 'recording'} />
      </View>

      <View style={styles.row}>
        <Btn tone="danger" label="Cancel" onPress={onCancel} />
        <Btn tone="primary" label="Finish" onPress={onFinish} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 18, paddingBottom: 18, paddingTop: 6, gap: 10 },
  row: { flexDirection: 'row', gap: 12 },
  btn: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  btnText: { fontWeight: '900', letterSpacing: 0.3 },
});
