import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/providers/AppThemeProvider';

export default function AdvancedSettingsScreen() {
  const router = useRouter();
  const {
    colors,
    fonts,
    paletteOptions,
    selectedPaletteId,
    setSelectedPaletteId,
  } = useAppTheme();

  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Advanced</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Theme</Text>

          <View style={styles.card}>
            <View style={styles.cardIntro}>
              <Text style={styles.cardTitle}>Highlight color family</Text>
              <Text style={styles.cardDescription}>
                Choose one accent family for the app. Each option uses three
                shades of the same color and is saved globally.
              </Text>
            </View>

            <View style={styles.paletteGrid}>
              {paletteOptions.map((palette) => {
                const isSelected = palette.id === selectedPaletteId;

                return (
                  <TouchableOpacity
                    key={palette.id}
                    activeOpacity={0.92}
                    style={[
                      styles.paletteCard,
                      isSelected && styles.paletteCardSelected,
                    ]}
                    onPress={() => void setSelectedPaletteId(palette.id)}
                  >
                    <View style={styles.paletteHeader}>
                      <Text style={styles.paletteName}>{palette.name}</Text>
                      {isSelected ? (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Active</Text>
                        </View>
                      ) : null}
                    </View>

                    <Text style={styles.paletteDescription}>
                      {palette.description}
                    </Text>

                    <View style={styles.swatchRow}>
                      <View
                        style={[
                          styles.swatch,
                          { backgroundColor: palette.trio.primary },
                        ]}
                      />
                      <View
                        style={[
                          styles.swatch,
                          { backgroundColor: palette.trio.secondary },
                        ]}
                      />
                      <View
                        style={[
                          styles.swatch,
                          { backgroundColor: palette.trio.tertiary },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
      backgroundColor: colors.background,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    backButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 18,
      lineHeight: 22,
    },
    headerSpacer: {
      width: 32,
    },
    section: {
      marginTop: 20,
    },
    sectionTitle: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 6,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
    },
    cardIntro: {
      marginBottom: 16,
    },
    cardTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 17,
      lineHeight: 22,
    },
    cardDescription: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      marginTop: 8,
    },
    paletteGrid: {
      gap: 12,
    },
    paletteCard: {
      backgroundColor: colors.card2,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
    },
    paletteCardSelected: {
      backgroundColor: colors.card3,
      borderColor: colors.highlight1,
    },
    paletteHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 12,
    },
    paletteName: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    activePill: {
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      paddingVertical: 6,
      paddingHorizontal: 10,
    },
    activePillText: {
      color: colors.highlight1,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    paletteDescription: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 8,
    },
    swatchRow: {
      flexDirection: 'row',
      gap: 10,
      marginTop: 14,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
  });
}
