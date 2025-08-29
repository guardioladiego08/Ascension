// components/cardio/AchievementCarousel.tsx
// Horizontal badges row for the top section.
// Swap the placeholder <Svg> with your actual imported SVGs later.

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Svg, Rect } from 'react-native-svg';

type Badge = { id: string; label: string; sub: string };

export default function AchievementCarousel({ badges }: { badges: Badge[] }) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 6, gap: 12 }}
      style={{ marginTop: 8 }}
    >
      {badges.map((b) => (
        <View key={b.id} style={styles.badgeWrap}>
          {/* Placeholder shield */}
          <Svg width={64} height={64}>
            <Rect x="0" y="0" width="64" height="64" rx="12" fill="#2a2a2a" />
          </Svg>
          <Text style={styles.badgeLabel}>{b.label}</Text>
          <Text style={styles.badgeSub}>{b.sub}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  badgeWrap: { alignItems: 'center', paddingHorizontal: 6 },
  badgeLabel: { color: '#fff', fontWeight: '800', marginTop: 6 },
  badgeSub: { color: '#fff', opacity: 0.8, marginTop: 2, fontSize: 12 },
});
