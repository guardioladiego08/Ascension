// app/(tabs)/home/BlankHome.tsx
// A static, pixel-faithful mock of the screenshot provided.
// - Dark theme
// - Rounded cards, soft shadows
// - Static numbers/text so you can wire real data later
// - Uses @expo/vector-icons (Ionicons + MaterialCommunityIcons)
// Drop this into your Expo Router project and import where needed.

import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { GlobalStyles } from '@/constants/GlobalStyles';
import LogoHeader from '@/components/my components/logoHeader';
import { useRouter } from 'expo-router';
import { Colors } from '@/constants/Colors';


export default function BlankHome() {
  const router = useRouter();
  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader/>
      <ScrollView contentContainerStyle={GlobalStyles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
          <Text style={GlobalStyles.header}>HOME</Text>
        {/* KPI Row */}
        <Text style={styles.sectionTitle}>SO FAR THIS WEEK</Text>
        <View style={styles.kpiRow}>
          <View style={GlobalStyles.kpiCard}>
            <Text style={GlobalStyles.kpiNumber}>12</Text>
            <Text style={GlobalStyles.kpiLabel}>Workouts</Text>
          </View>
          <View style={GlobalStyles.kpiCard}>
            <Text style={GlobalStyles.kpiNumber}>8.5</Text>
            <Text style={GlobalStyles.kpiLabel}>Hours</Text>
          </View>
          <View style={GlobalStyles.kpiCard}>
            <Text style={GlobalStyles.kpiNumber}>2.4k</Text>
            <Text style={GlobalStyles.kpiLabel}>Calories</Text>
          </View>
        </View>

        {/* Start Workout */}
        <Text style={styles.sectionTitle}>START WORKOUT</Text>
        <View style={styles.quickRow}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={GlobalStyles.quickCard}
            onPress={() => router.replace('/add/Strength/StrengthTrain')}
          >
            <MaterialCommunityIcons name="arm-flex" size={28} color={Colors.dark.highlight1} />
            <Text style={styles.quickText}>Weights</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={GlobalStyles.quickCard}
            onPress={() => router.push('/add/Cardio/outdoorRun')}
          >
            <Ionicons name="walk" size={28} color={Colors.dark.highlight2} />
            <Text style={styles.quickText}>Run</Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.9}
            style={GlobalStyles.quickCard}
            onPress={() => router.push('/new/bike')}
          >
            <Ionicons name="bicycle" size={28} color={Colors.dark.highlight3} />
            <Text style={styles.quickText}>Bike</Text>
          </TouchableOpacity>
        </View>

        {/* Nutrition Today */}
        <Text style={styles.sectionTitle}>NUTRITION TODAY</Text>
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Ionicons name="checkmark-circle" size={18} color="#7BE495" />
              <Text style={styles.cardHeaderTitle}>Daily Summary</Text>
            </View>
            <Text style={styles.link}>View All</Text>
          </View>

          <View style={styles.calRow}>
            <Text style={styles.calLeft}>1,640</Text>
            <Text style={styles.calRight}>/ 2,400 kcal</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>

          <View style={styles.macroRow}>
            <View style={styles.macroItem}><Text style={styles.macroNumber}>142g</Text><Text style={styles.macroLabel}>PROTEIN</Text></View>
            <View style={styles.macroItem}><Text style={styles.macroNumber}>186g</Text><Text style={styles.macroLabel}>CARBS</Text></View>
            <View style={styles.macroItem}><Text style={styles.macroNumber}>58g</Text><Text style={styles.macroLabel}>FAT</Text></View>
          </View>
        </View>

        <View style={styles.row2}>
          <TouchableOpacity
            activeOpacity={0.9}
            style={[styles.ctaButton, { marginRight: 14 }]}
            onPress={() => router.push('/add/Nutrition/logMeal')}
          >
            <Ionicons name="add-circle" size={18} color="#0E151F" />
            <Text style={styles.ctaText}>Log Meal</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.9} style={styles.ctaButton}>
            <Ionicons name="camera" size={18} color="#0E151F" />
            <Text style={styles.ctaText}>Scan Food</Text>
          </TouchableOpacity>
        </View>

        {/* Social */}
        <Text style={styles.sectionTitle}>SOCIAL</Text>
        <View style={styles.listCard}>
          <View style={styles.listIconWrap}><Ionicons name="people" size={20} color="#F4B3FF" /></View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>Workout Feed</Text>
            <Text style={styles.listSubtitle}>See what friends are doing</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
        </View>
        <View style={styles.listCard}>
          <View style={styles.listIconWrap}><Ionicons name="trophy" size={20} color="#FFD38C" /></View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>Leaderboards</Text>
            <Text style={styles.listSubtitle}>Compete with the community</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
        </View>
        <View style={styles.listCard}>
          <View style={styles.listIconWrap}><Ionicons name="medal" size={20} color="#8CE0FF" /></View>
          <View style={styles.listTextWrap}>
            <Text style={styles.listTitle}>Challenges</Text>
            <Text style={styles.listSubtitle}>Join active challenges</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#AAB2C5" />
        </View>

      </ScrollView>

    </SafeAreaView>
  );
}

function TabItem({ label, icon, active = false }: { label: string; icon: any; active?: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons name={icon} size={20} color={active ? '#6EA8FF' : '#AAB2C5'} />
      <Text style={[styles.tabLabel, active && { color: '#6EA8FF' }]}>{label}</Text>
    </View>
  );
}

const CARD = '#1A2230';
const CARD_DARK = '#151C27';
const PRIMARY = '#6EA8FF';

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 18, paddingTop: 8 },
  greeting: { color: '#AAB2C5', marginTop: 6, marginBottom: 12, fontSize: 13 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { color: '#97A3B6', fontSize: 12, marginTop: 10, marginBottom: 8, fontWeight: '700', letterSpacing: 0.6 },

  quickRow: { flexDirection: 'row', justifyContent: 'space-between' },
  quickText: { color: '#D6DEEE', fontWeight: '600', marginTop: 8 },

  card: { backgroundColor: CARD, borderRadius: 16, padding: 14, marginTop: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center' },
  cardHeaderTitle: { color: '#D6DEEE', fontWeight: '700', marginLeft: 6 },
  link: { color: PRIMARY, fontSize: 12, fontWeight: '600' },

  calRow: { flexDirection: 'row', alignItems: 'baseline' },
  calLeft: { color: '#EAF2FF', fontSize: 22, fontWeight: '800' },
  calRight: { color: '#97A3B6', marginLeft: 6 },

  progressTrack: { height: 6, backgroundColor: '#2A3344', borderRadius: 999, marginTop: 10 },
  progressFill: { width: '68%', height: 6, backgroundColor: PRIMARY, borderRadius: 999 },

  macroRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  macroItem: { alignItems: 'center', flex: 1 },
  macroNumber: { color: '#EAF2FF', fontWeight: '800' },
  macroLabel: { color: '#97A3B6', fontSize: 10, marginTop: 2 },

  row2: { flexDirection: 'row', marginTop: 12 },
  ctaButton: { flex: 1, backgroundColor: '#7BE495', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  ctaText: { color: '#0E151F', fontWeight: '800' },

  listCard: { backgroundColor: CARD, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  listIconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#111826', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  listTextWrap: { flex: 1 },
  listTitle: { color: '#EAF2FF', fontWeight: '700' },
  listSubtitle: { color: '#97A3B6', fontSize: 12, marginTop: 2 },

  
});