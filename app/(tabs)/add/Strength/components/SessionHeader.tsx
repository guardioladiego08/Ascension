// app/(tabs)/add/Strength/components/SessionHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GlobalStyles } from '@/constants/GlobalStyles';

type Props = {
  title: string;
  paused: boolean;
  seconds: number;
  onPauseToggle: () => void;
  onCancel: () => void;
};

const SessionHeader: React.FC<Props> = ({ title, paused, seconds, onPauseToggle, onCancel }) => {
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        <Text style={GlobalStyles.title}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <Text style={GlobalStyles.timer}>{mm}:{ss}</Text>
      <Text style={[styles.status, paused ? styles.pausedStatus : null]}>
        {paused ? '● Paused' : '● In Progress'}
      </Text>

      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.pauseBtn,
            { backgroundColor: paused ? '#5c976e' : '#7a7a7aff' } // green when paused (Resume), grey when running (Pause)
          ]}
          onPress={onPauseToggle}
        >
          <Ionicons
            name={paused ? 'play' : 'pause'}
            size={16}
            color="#e7ecff"
          />
          <Text style={styles.pauseText}>
            {paused ? 'Resume' : 'Pause'}
          </Text>
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
  status: { color: '#6fdb7f', marginTop: 4, fontWeight: '600' },
  pausedStatus: { color: '#f9b24e' },
  controls: { flexDirection: 'row', gap: 12, marginTop: 12 },
  pauseBtn: {
    backgroundColor: '#5c976eff',
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
