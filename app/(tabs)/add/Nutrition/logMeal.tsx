// app/(tabs)/nutrition/logMeal.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { GlobalStyles } from '@/constants/GlobalStyles';
import { Colors } from '@/constants/Colors';
import LogoHeader from '@/components/my components/logoHeader';
import MealsFoodsList from './components/MealsFoodsList';
import { LinearGradient } from 'expo-linear-gradient';

const BG = Colors.dark.background;
const CARD = Colors.dark.card;
const CARD_SOFT = Colors.dark.card;
const PRIMARY = Colors.dark.highlight1;
const TEXT_PRIMARY = Colors.dark.text;
const TEXT_MUTED = Colors.dark.textMuted;

const TABS = ['My Meals', 'My Foods', 'All'] as const;
type TabKey = (typeof TABS)[number];

export default function LogMeal() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('My Meals');
  const [searchQuery, setSearchQuery] = useState('');
  const [tabWidth, setTabWidth] = useState(0);

  const indicatorX = useRef(new Animated.Value(0)).current;

  const handleTabPress = (tab: TabKey, index: number) => {
    setActiveTab(tab);
    if (!tabWidth) return;

    Animated.spring(indicatorX, {
      toValue: index * tabWidth,
      useNativeDriver: true,
      friction: 8,
      tension: 80,
    }).start();
  };

  useEffect(() => {
    if (!tabWidth) return;
    const initialIndex = TABS.indexOf(activeTab);
    indicatorX.setValue(initialIndex * tabWidth);
  }, [tabWidth]);

  return (
    <LinearGradient
      colors={['#3a3a3bff', '#1e1e1eff', BG]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={{ flex: 1 }}
    >
      <View style={GlobalStyles.safeArea}>
        <LogoHeader showBackButton />
        <View style={styles.main}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={GlobalStyles.header}>Log Meal</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tabs with sliding indicator */}
            <View
              style={styles.tabRow}
              onLayout={e => {
                const width = e.nativeEvent.layout.width;
                setTabWidth(width / TABS.length);
              }}
            >
              {tabWidth > 0 && (
                <Animated.View
                  style={[
                    styles.tabIndicator,
                    {
                      width: tabWidth,
                      transform: [{ translateX: indicatorX }],
                    },
                  ]}
                />
              )}
              {TABS.map((tab, index) => {
                const isActive = tab === activeTab;
                return (
                  <TouchableOpacity
                    key={tab}
                    style={styles.tabBtn}
                    activeOpacity={0.8}
                    onPress={() => handleTabPress(tab, index)}
                  >
                    <Text
                      style={[
                        styles.tabText,
                        isActive && styles.tabTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Action buttons: Create Meal + Scan */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                activeOpacity={0.9}
                onPress={() => router.push('./createMeal')}
              >
                <Ionicons name="add-circle" size={18} color="#05101F" />
                <Text style={styles.actionBtnPrimaryText}>Create Meal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                activeOpacity={0.9}
                onPress={() =>
                  Alert.alert(
                    'Coming soon',
                    'Barcode scanning will be available in a future update.'
                  )
                }
              >
                <MaterialCommunityIcons
                  name="barcode-scan"
                  size={18}
                  color={TEXT_PRIMARY}
                />
                <Text style={styles.actionBtnSecondaryText}>Scan</Text>
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.searchBar}>
              <Ionicons name="search" size={16} color={TEXT_MUTED} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search meals and foods"
                placeholderTextColor={TEXT_MUTED}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
              />
            </View>

            {/* List of items – driven entirely by the separate component */}
            <MealsFoodsList activeTab={activeTab} searchQuery={searchQuery} />
          </ScrollView>
        </View>
      </View>
    </LinearGradient>
  );  
}

const styles = StyleSheet.create({
  main: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  /* Tabs */
  tabRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 15,
    padding: 4,
    marginBottom: 16,
    position: 'relative',
    overflow: 'hidden',
  },
  tabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    borderRadius: 12,
    backgroundColor: PRIMARY,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: TEXT_MUTED,
  },
  tabTextActive: {
    color: '#05101F',
  },
  /* Actions */
  actionRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: PRIMARY,
    marginRight: 8,
  },
  actionBtnPrimaryText: {
    color: '#05101F',
    fontWeight: '700',
    fontSize: 14,
    marginLeft: 6,
  },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: CARD_SOFT,
    borderWidth: 1,
    borderColor: '#26324A',
    marginLeft: 8,
  },
  actionBtnSecondaryText: {
    color: TEXT_PRIMARY,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  /* Search */
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD_SOFT,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#1F2A3A',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    color: TEXT_PRIMARY,
    fontSize: 14,
    paddingVertical: 0,
  },
});
