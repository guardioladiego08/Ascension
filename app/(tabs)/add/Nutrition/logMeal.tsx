import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import LogoHeader from '@/components/my components/logoHeader';
import MealsFoodsList from './components/MealsFoodsList';
import { NUTRITION_ROUTES } from '@/lib/nutrition/navigation';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../home/tokens';

export default function LogMeal() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.page}>
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
              <Text style={styles.eyebrow}>Nutrition Log</Text>
              <Text style={styles.header}>Record meals</Text>
              <Text style={styles.heroText}>
                Review saved meals, build new recipes, or scan packaged foods without
                leaving the nutrition flow.
              </Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.buttonPrimary, styles.actionPrimary]}
              activeOpacity={0.9}
              onPress={() => router.push(NUTRITION_ROUTES.createMeal)}
            >
              <Ionicons name="add-circle" size={18} color={colors.blkText} />
              <Text style={styles.buttonTextPrimary}>Create Meal</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.buttonSecondary, styles.actionSecondary]}
              activeOpacity={0.9}
              onPress={() => router.push(NUTRITION_ROUTES.scanFood)}
            >
              <MaterialCommunityIcons
                name="barcode-scan"
                size={18}
                color={colors.text}
              />
              <Text style={styles.buttonTextSecondary}>Scan Barcode</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.buttonSecondary, styles.quickLogButton]}
            activeOpacity={0.9}
            onPress={() => router.push(NUTRITION_ROUTES.logFood)}
          >
            <Ionicons name="search" size={16} color={HOME_TONES.textPrimary} />
            <Text style={styles.buttonTextSecondary}>Quick Log Food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.buttonSecondary, styles.quickLogButton]}
            activeOpacity={0.9}
            onPress={() => router.push(NUTRITION_ROUTES.createFood)}
          >
            <Ionicons name="add-circle-outline" size={16} color={HOME_TONES.textPrimary} />
            <Text style={styles.buttonTextSecondary}>Create Public Food</Text>
          </TouchableOpacity>

          <MealsFoodsList activeTab="My Meals" searchQuery="" />
        </ScrollView>
      </View>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: HOME_TONES.background,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    header: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.display,
      fontSize: 32,
      lineHeight: 36,
      letterSpacing: -0.8,
    },
    buttonPrimary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.highlight1,
      borderWidth: 1,
      borderColor: colors.highlight1,
    },
    buttonSecondary: {
      height: 48,
      borderRadius: 16,
      paddingHorizontal: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface2,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    buttonTextPrimary: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    buttonTextSecondary: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingTop: 8,
      paddingBottom: 40,
      gap: 14,
    },
    hero: {
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 22,
    },
    heroCopy: {
      gap: 8,
    },
    heroText: {
      color: HOME_TONES.textSecondary,
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
    quickLogButton: {
      flexDirection: 'row',
      gap: 8,
    },
  });
}
