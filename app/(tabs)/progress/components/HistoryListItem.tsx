import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Colors } from '@/constants/Colors';

type Props = {
  title: string;
  subtitle: string;
  meta?: string;
  badgeText?: string;
  badgeTone?: 'neutral' | 'success' | 'accent';
  onPress: () => void;
};

export default function HistoryListItem({
  title,
  subtitle,
  meta,
  badgeText,
  badgeTone = 'neutral',
  onPress,
}: Props) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      style={styles.card}
      onPress={onPress}
    >
      <View style={styles.left}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badgeText ? (
            <View
              style={[
                styles.badge,
                badgeTone === 'success'
                  ? styles.badgeSuccess
                  : badgeTone === 'accent'
                    ? styles.badgeAccent
                    : styles.badgeNeutral,
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  badgeTone === 'success'
                    ? styles.badgeTextSuccess
                    : badgeTone === 'accent'
                      ? styles.badgeTextAccent
                      : styles.badgeTextNeutral,
                ]}
              >
                {badgeText}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.subtitle}>{subtitle}</Text>
        {meta ? <Text style={styles.meta}>{meta}</Text> : null}
      </View>

      <Ionicons name="chevron-forward" size={18} color="#9DA4C4" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  left: {
    flex: 1,
    paddingRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 15,
    color: '#E5E7F5',
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#C7D2FE',
  },
  meta: {
    marginTop: 4,
    fontSize: 12,
    color: '#9DA4C4',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeNeutral: {
    backgroundColor: '#111827',
  },
  badgeAccent: {
    backgroundColor: '#1E1B4B',
  },
  badgeSuccess: {
    backgroundColor: '#052E16',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextNeutral: {
    color: '#CBD5E1',
  },
  badgeTextAccent: {
    color: '#C7D2FE',
  },
  badgeTextSuccess: {
    color: '#86EFAC',
  },
});
