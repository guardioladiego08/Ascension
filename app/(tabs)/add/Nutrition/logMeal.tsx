import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import MealsFoodsList from './components/MealsFoodsList';
import { useAppTheme } from '@/providers/AppThemeProvider';

const TABS = ['My Meals', 'My Foods', 'All'] as const;
type TabKey = (typeof TABS)[number];

export default function LogMeal() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

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
  }, [activeTab, indicatorX, tabWidth]);

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={globalStyles.page}
    >
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <View style={styles.heroCopy}>
              <Text style={globalStyles.eyebrow}>Nutrition Log</Text>
              <Text style={globalStyles.header}>Record meals</Text>
              <Text style={styles.heroText}>
                Search saved meals, build new recipes, or scan packaged foods without
                leaving the nutrition flow.
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[globalStyles.buttonPrimary, styles.actionPrimary]}
              activeOpacity={0.9}
              onPress={() => router.push('./createMeal')}
            >
              <Ionicons name="add-circle" size={18} color={colors.blkText} />
              <Text style={globalStyles.buttonTextPrimary}>Create Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[globalStyles.buttonSecondary, styles.actionSecondary]}
              activeOpacity={0.9}
              onPress={() => router.push('./scanFood')}
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={18}
                color={colors.text}
              />
              <Text style={globalStyles.buttonTextSecondary}>Scan Food</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={16} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search meals and foods"
              placeholderTextColor={colors.textOffSt}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>

          <View
            style={styles.tabRow}
            onLayout={(event) => {
              const width = event.nativeEvent.layout.width;
              setTabWidth(width / TABS.length);
            }}
          >
            {tabWidth > 0 ? (
              <Animated.View
                style={[
                  styles.tabIndicator,
                  { width: tabWidth, transform: [{ translateX: indicatorX }] },
                ]}
              />
            ) : null}

            {TABS.map((tab, index) => {
              const isActive = tab === activeTab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={styles.tabButton}
                  activeOpacity={0.86}
                  onPress={() => handleTabPress(tab, index)}
                >
                  <Text style={[styles.tabText, isActive ? styles.tabTextActive : null]}>
                    {tab}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <MealsFoodsList activeTab={activeTab} searchQuery={searchQuery} />
        </ScrollView>
      </View>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: 8,
      paddingBottom: 40,
      gap: 14,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 20,
    },
    heroCopy: {
      gap: 8,
    },
    heroText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: '92%',
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
    },
    actionPrimary: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    actionSecondary: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 14,
      minHeight: 52,
    },
    searchInput: {
      flex: 1,
      marginLeft: 10,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 15,
    },
    tabRow: {
      flexDirection: 'row',
      position: 'relative',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 4,
      overflow: 'hidden',
    },
    tabIndicator: {
      position: 'absolute',
      top: 4,
      bottom: 4,
      left: 4,
      borderRadius: 14,
      backgroundColor: colors.highlight1,
    },
    tabButton: {
      flex: 1,
      minHeight: 42,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1,
    },
    tabText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 14,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    tabTextActive: {
      color: colors.blkText,
    },
  });
}
