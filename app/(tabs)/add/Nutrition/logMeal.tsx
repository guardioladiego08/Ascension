import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';

const MEAL_TABS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealTab = (typeof MEAL_TABS)[number];

export default function AddMeal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<MealTab>('Lunch');

  return (
    <SafeAreaView style={GlobalStyles.safeArea}>
      <LogoHeader showBackButton></LogoHeader>
      <View style={styles.main}>
        {/* Top Header Row */}
        <View style={styles.headerRow}>
          <Text style={GlobalStyles.header}>Add Meal</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Meal Tabs */}
          <View style={styles.tabRow}>
            {MEAL_TABS.map(tab => {
              const isActive = tab === activeTab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[styles.tabBtn, isActive && styles.tabBtnActive]}
                  onPress={() => setActiveTab(tab)}
                  activeOpacity={0.9}
                >
                  <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* QUICK ADD */}
          <Text style={styles.sectionLabel}>QUICK ADD</Text>
          <View style={styles.quickGrid}>
            <QuickTile
                iconBg="#15C779"
                icon={<Ionicons name="add" size={22} color="#EAF2FF" />}
                title="Create Meal"
                subtitle="Build from items"
                onPress={() => router.push('./createMeal')}  // 👈 NEW
                />
            <QuickTile
              iconBg="#8A5CFF"
              icon={<Ionicons name="camera" size={22} color="#EAF2FF" />}
              title="Scan Food"
              subtitle="AI recognition"
            />
            <QuickTile
              iconBg="#F4A01D"
              icon={<Ionicons name="search" size={22} color="#EAF2FF" />}
              title="Search"
              subtitle="Find recipes"
            />
            <QuickTile
              iconBg="#E15DFF"
              icon={<MaterialCommunityIcons name="pencil" size={22} color="#EAF2FF" />}
              title="Manual Entry"
              subtitle="Custom item"
            />
          </View>

          {/* RECENT & FAVORITES */}
          <Text style={styles.sectionLabel}>RECENT & FAVORITES</Text>
          <RecentMealCard
            name="Grilled Chicken Salad"
            calories="385 cal"
            protein="42g protein"
          />
          <RecentMealCard
            name="Protein Smoothie Bowl"
            calories="420 cal"
            protein="35g protein"
          />
          <RecentMealCard
            name="Turkey Wrap"
            calories="340 cal"
            protein="28g protein"
          />

          {/* TODAY'S PROGRESS */}
          <Text style={styles.sectionLabel}>TODAY'S PROGRESS</Text>
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View style={styles.progressHeaderLeft}>
                <Ionicons name="checkmark-circle" size={18} color="#15C779" />
                <Text style={styles.progressTitle}>Daily Summary</Text>
              </View>
              <Text style={styles.progressLink}>View All</Text>
            </View>

            <View style={styles.calRow}>
              <Text style={styles.calValue}>1,640</Text>
              <Text style={styles.calTarget}>/ 2,400 kcal</Text>
            </View>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.macroRow}>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>142g</Text>
                <Text style={styles.macroLabel}>PROTEIN</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>186g</Text>
                <Text style={styles.macroLabel}>CARBS</Text>
              </View>
              <View style={styles.macroItem}>
                <Text style={styles.macroNumber}>58g</Text>
                <Text style={styles.macroLabel}>FAT</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

/* --- Small Components --- */

type QuickTileProps = {
  iconBg: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress?: () => void;   // 👈 NEW
};

function QuickTile({ iconBg, icon, title, subtitle, onPress }: QuickTileProps) {
  return (
    <TouchableOpacity style={styles.quickTile} activeOpacity={0.9} onPress={onPress}>
      <View style={[styles.quickIconWrap, { backgroundColor: iconBg }]}>
        {icon}
      </View>
      <Text style={styles.quickTitle}>{title}</Text>
      <Text style={styles.quickSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}


type RecentMealCardProps = {
  name: string;
  calories: string;
  protein: string;
};

function RecentMealCard({ name, calories, protein }: RecentMealCardProps) {
  return (
    <View style={styles.recentCard}>
      <View style={styles.recentTextWrap}>
        <Text style={styles.recentTitle}>{name}</Text>
        <View style={styles.recentMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="flame" size={12} color="#9AA4BF" />
            <Text style={styles.metaText}>{calories}</Text>
          </View>
          <View style={[styles.metaItem, { marginLeft: 12 }]}>
            <Ionicons name="barbell" size={12} color="#9AA4BF" />
            <Text style={styles.metaText}>{protein}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.plusBtn} activeOpacity={0.8}>
        <Ionicons name="add" size={18} color="#05101F" />
      </TouchableOpacity>
    </View>
  );
}

/* --- Styles --- */

const CARD = Colors.dark.card;
const CARD_SOFT = Colors.dark.card;
const PRIMARY_GREEN = '#15C779';
const TEXT_PRIMARY = '#EAF2FF';
const TEXT_MUTED = '#9AA4BF';

const styles = StyleSheet.create({
  main: {
    flex: 1,
    backgroundColor: Colors.dark.background,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },

  /* Header */
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },

  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: Colors.dark.card,
    borderRadius: 15,
    padding: 4,
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnActive: {
    backgroundColor: PRIMARY_GREEN,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.dark.text,
  },
  tabTextActive: {
    color: '#05101F',
  },

  /* Sections */
  sectionLabel: {
    color: TEXT_MUTED,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 10,
    marginTop: 4,
  },

  /* Quick Add Grid */
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  quickTile: {
    width: '48%',
    backgroundColor: CARD_SOFT,
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  quickIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  quickTitle: {
    color: TEXT_PRIMARY,
    fontSize: 14,
    fontWeight: '600',
  },
  quickSubtitle: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginTop: 2,
  },

  /* Recent & Favorites */
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_SOFT,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
  },
  recentTextWrap: {
    flex: 1,
  },
  recentTitle: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
    marginBottom: 4,
  },
  recentMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    color: TEXT_MUTED,
    fontSize: 11,
    marginLeft: 4,
  },
  plusBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PRIMARY_GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },

  /* Today's Progress */
  progressCard: {
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    marginTop: 4,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  progressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTitle: {
    color: TEXT_PRIMARY,
    fontWeight: '700',
    marginLeft: 6,
    fontSize: 13,
  },
  progressLink: {
    color: '#6EA8FF',
    fontSize: 12,
    fontWeight: '600',
  },
  calRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  calValue: {
    color: TEXT_PRIMARY,
    fontSize: 22,
    fontWeight: '800',
  },
  calTarget: {
    color: TEXT_MUTED,
    marginLeft: 6,
    fontSize: 12,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#26324A',
    borderRadius: 999,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressFill: {
    width: '68%',
    height: '100%',
    backgroundColor: PRIMARY_GREEN,
    borderRadius: 999,
  },
  macroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  macroItem: {
    flex: 1,
    alignItems: 'center',
  },
  macroNumber: {
    color: TEXT_PRIMARY,
    fontWeight: '800',
    fontSize: 13,
  },
  macroLabel: {
    color: TEXT_MUTED,
    fontSize: 10,
    marginTop: 2,
  },
});
