import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';

const CARD = Colors.dark.card;
const BORDER = Colors.dark.border ?? '#1F2937';
const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';
const PRIMARY = Colors.dark.highlight1;

export default function ControlsBar(props: {
  status: 'idle' | 'recording' | 'paused' | 'saving';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  if (props.status === 'idle') {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={[styles.bigBtn, styles.primary]} onPress={props.onStart}>
          <Text style={styles.bigText}>Start</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (props.status === 'paused') {
    return (
      <View style={styles.wrap}>
        <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={props.onDiscard}>
          <Text style={[styles.btnText, { color: MUTED }]}>Discard</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.primary]} onPress={props.onResume}>
          <Text style={styles.btnText}>Resume</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.btn, styles.danger]} onPress={props.onFinish}>
          <Text style={styles.btnText}>Finish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // recording / saving
  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={[styles.btn, styles.ghost]} onPress={props.onDiscard} disabled={props.status === 'saving'}>
        <Text style={[styles.btnText, { color: MUTED }]}>Discard</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.primary]} onPress={props.onPause} disabled={props.status === 'saving'}>
        <Text style={styles.btnText}>Pause</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.btn, styles.danger]} onPress={props.onFinish} disabled={props.status === 'saving'}>
        <Text style={styles.btnText}>{props.status === 'saving' ? 'Saving…' : 'Finish'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: CARD,
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    gap: 10,
  },
  bigBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  bigText: { color: 'white', fontWeight: '900', fontSize: 18 },
  btn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  btnText: { color: 'white', fontWeight: '800' },
  primary: { backgroundColor: PRIMARY, borderColor: PRIMARY },
  ghost: { backgroundColor: 'transparent', borderColor: BORDER },
  danger: { backgroundColor: '#B91C1C', borderColor: '#B91C1C' },
});
