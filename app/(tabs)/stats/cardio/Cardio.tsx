// app/(tabs)/stats/cardio/Cardio.tsx
// Screen: "Cardio" — matches your mock exactly.
// - Top achievements row scrolls horizontally (SVGs you’ll provide later).
// - "Activity" section shows 5 most recent items (from dataset).
// - "View All" button navigates to the full list with search & filters.
// - Pressing a card opens one of two summary modals (indoor/outdoor).
//
// ✅ Deps (already common in your app; add if missing):
//   expo-router, react-native-svg, date-fns
//
//   yarn add react-native-svg date-fns
//
// Notes:
// - Replace <YourLogo /> with your existing logo header if desired.
// - Badges use placeholders; drop your .svg into /assets/svg and import.

import React, { useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';
import { Svg, Rect } from 'react-native-svg';

import LogoHeader from '@/components/my components/logoHeader';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';

import activitiesData, { CardioActivity, CardioType } from '@/assets/data/cardio/cardioActivities';
import AchievementCarousel from '@/components/my components/cardio/AchievementCarousel';
import ActivityCard from '@/components/my components/cardio/ActivityCard';
import IndoorActivityModal from '@/components/my components/cardio/IndoorActivityModal';
import OutdoorActivityModal from '@/components/my components/cardio/OutdoorActivityModal';

const BG = '#3f3f3f';
const CARD = '#5a5a5a';

export default function Cardio() {
  const router = useRouter();
  const [selected, setSelected] = useState<CardioActivity | null>(null);

  const recent = useMemo(
    () =>
      [...activitiesData]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5),
    []
  );

  return (
    <SafeAreaView style={styles.safe}>
        <LogoHeader showBackButton></LogoHeader>
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      {/* Logo + Title */}
      <Text style={GlobalStyles.header}>CARDIO</Text>


        {/* Achievements */}
        <AchievementCarousel
          badges={[
            { id: '5k', label: '5K', sub: '24:39 min' },
            { id: '10k', label: '10K', sub: '52:29 min' },
            { id: 'long', label: 'LONGEST\nRUN', sub: '25.6 mi' },
          ]}
        />

        {/* Activity header with tiny filter icon (visual only here) */}
        <View style={styles.sectionHeader}>
          <Text style={GlobalStyles.subtitle}>ACTIVITY</Text>
        </View>

        {/* Recent cards */}
        <View style={{ gap: 12 }}>
          {recent.map((item) => (
            <ActivityCard
              key={item.id}
              activity={item}
              onPress={() => setSelected(item)}
              style={{ backgroundColor: CARD }}
            />
          ))}
        </View>

        {/* View All button */}
        <TouchableOpacity
          style={styles.viewAllBtn}
          onPress={() => router.push('/(tabs)/stats/cardio/allCardioActivities')}
        >
          <Text style={styles.viewAllText}>VIEW ALL ACTIVITIES</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modals */}
      <Modal visible={!!selected && selected?.type === 'indoor'} transparent animationType="slide">
        <IndoorActivityModal activity={selected!} onClose={() => setSelected(null)} />
      </Modal>
      <Modal visible={!!selected && selected?.type === 'outdoor'} transparent animationType="slide">
        <OutdoorActivityModal activity={selected!} onClose={() => setSelected(null)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: { paddingHorizontal: 16 },
  logoA: { color: Colors.dark.text, fontWeight: '800' },
  title: { color: Colors.dark.text, fontSize: 24, fontWeight: '800', letterSpacing: 1.2 },
  sectionHeader: {
    marginTop: 16,
    marginBottom: 10,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterGlyph: {
    width: 18,
    height: 18,
    borderLeftWidth: 2,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: Colors.dark.text,
    transform: [{ rotate: '45deg' }],
    opacity: 0.7,
  },
  viewAllBtn: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: Colors.dark.highlight1,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  viewAllText: { color: Colors.dark.blkText, fontWeight: '700', letterSpacing: 0.5 },
});
