import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';

const TEXT = Colors.dark.text;
const MUTED = Colors.dark.textMuted ?? '#9AA4BF';

export default function RecorderHeader({
  title,
  onBack,
  autoPauseEnabled,
  onToggleAutoPause,
}: {
  title: string;
  onBack: () => void;
  autoPauseEnabled: boolean;
  onToggleAutoPause: () => void;
}) {
  return (
    <View style={styles.wrap}>
      <TouchableOpacity onPress={onBack} style={styles.iconBtn} activeOpacity={0.8}>
        <Ionicons name="chevron-back" size={20} color={TEXT} />
      </TouchableOpacity>

      <Text style={styles.title}>{title}</Text>

      <TouchableOpacity onPress={onToggleAutoPause} style={styles.iconBtn} activeOpacity={0.8}>
        <Ionicons name={autoPauseEnabled ? 'pause' : 'play'} size={18} color={TEXT} />
        <Text style={styles.badge}>{autoPauseEnabled ? 'AUTO' : 'MAN'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 10,
  },
  iconBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    color: TEXT,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  badge: {
    color: MUTED,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
});
