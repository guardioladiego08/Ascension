// app/(tabs)/add/Strength/components/SessionHeader.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title: string;
  paused: boolean;
  timerResetKey: number;   // 👈 NEW
  onPauseToggle: () => void;
  onCancel: () => void;
};

const SessionHeader: React.FC<Props> = ({ title, paused, timerResetKey, onPauseToggle, onCancel }) => {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (!paused) setSeconds(s => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, [paused]);
  
  useEffect(() => {
    setSeconds(0);  
  }, [timerResetKey]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onCancel}>
          <Ionicons name="chevron-back" size={24} color="#cfd7ff" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={styles.timer}>{mm}:{ss}</Text>
      <Text style={styles.status}>● In Progress</Text>

      <View style={styles.controls}>
        <TouchableOpacity style={styles.pauseBtn} onPress={onPauseToggle}>
          <Ionicons name={paused ? 'play' : 'pause'} size={16} color="#e7ecff" />
          <Text style={styles.pauseText}>{paused ? 'Resume' : 'Pause'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SessionHeader;

const styles = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 12 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { color: '#e7ecff', fontSize: 16, fontWeight: '700' },
  timer: { color: '#e7ecff', fontSize: 42, fontWeight: '800', marginTop: 6 },
  status: { color: '#6fdb7f', marginTop: 4, fontWeight: '600' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  pauseBtn: {
    backgroundColor: '#1a2237',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pauseText: { color: '#e7ecff', fontWeight: '700' },
  cancelBtn: {
    backgroundColor: '#ec4b4b',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#fff', fontWeight: '800' },
});
