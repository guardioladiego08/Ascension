import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import { useAppTheme } from '@/providers/AppThemeProvider';

export default function BikeSessionPlaceholder() {
  const router = useRouter();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <LinearGradient
      colors={[colors.gradientTop, '#0A131B', colors.gradientBottom]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={globalStyles.page}
    >
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.wrapper}>
          <View style={[globalStyles.panel, styles.heroCard]}>
            <View style={styles.iconWrap}>
              <Ionicons name="bicycle-outline" size={34} color={colors.highlight2} />
            </View>

            <Text style={globalStyles.eyebrow}>Bike Session</Text>
            <Text style={styles.title}>Ride tracking is the next screen to build.</Text>
            <Text style={styles.subtitle}>
              The new home action now has a dedicated destination, but the actual biking
              session flow is still a placeholder so rides are not accidentally saved as runs.
            </Text>

            <View style={styles.featureList}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.highlight1} />
                <Text style={styles.featureText}>Home action is wired and ready.</Text>
              </View>

              <View style={styles.featureRow}>
                <Ionicons name="time-outline" size={16} color={colors.highlight2} />
                <Text style={styles.featureText}>Dedicated GPS and ride metrics still need implementation.</Text>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                activeOpacity={0.92}
                style={[globalStyles.buttonPrimary, styles.button]}
                onPress={() => router.push('/home')}
              >
                <Text style={globalStyles.buttonTextPrimary}>Back to home</Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.92}
                style={[globalStyles.buttonSecondary, styles.button]}
                onPress={() =>
                  router.push({
                    pathname: '/add/Cardio/outdoor/OutdoorSession',
                    params: { title: 'Running Session', activityType: 'run' },
                  })
                }
              >
                <Text style={globalStyles.buttonTextSecondary}>Start a run instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrapper: {
      flex: 1,
      justifyContent: 'center',
      paddingBottom: 40,
    },
    heroCard: {
      overflow: 'hidden',
    },
    iconWrap: {
      width: 68,
      height: 68,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSecondarySoft,
      marginBottom: 18,
    },
    title: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 30,
      lineHeight: 34,
      letterSpacing: -0.8,
      marginTop: 10,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      marginTop: 12,
    },
    featureList: {
      marginTop: 22,
      gap: 12,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 18,
      paddingHorizontal: 14,
      paddingVertical: 14,
    },
    featureText: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      marginTop: 24,
      gap: 10,
    },
    button: {
      width: '100%',
    },
  });
}
