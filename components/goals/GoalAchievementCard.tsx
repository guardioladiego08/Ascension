import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';

type Props = {
  title?: string;
  description: string;
};

export default function GoalAchievementCard({
  title = 'Goal reached',
  description,
}: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconWrap}>
        <Ionicons name="checkmark-circle" size={18} color="#052E16" />
      </View>
      <View style={styles.copyWrap}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.description}>{description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(21, 199, 121, 0.28)',
    backgroundColor: 'rgba(21, 199, 121, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.dark.highlight1 ?? '#15C779',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: {
    flex: 1,
  },
  title: {
    color: '#EAF2FF',
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    marginTop: 3,
    color: '#C7D2FE',
    fontSize: 12,
    lineHeight: 17,
  },
});
