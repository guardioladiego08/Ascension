import React, { useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import LogoHeader from '@/components/my components/logoHeader';
import { useSmartBack } from '@/lib/navigation/useSmartBack';
import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '@/app/(tabs)/home/tokens';

import {
  OUTDOOR_RUN_TYPES,
  getOutdoorRunTitle,
  type OutdoorRunTypeOption,
} from './runTypes';

const HOME_ROUTE = '/(tabs)/home';

export default function RunTypeSelect() {
  const router = useRouter();
  const { goBackSmart } = useSmartBack();
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.page}>
      <View style={[globalStyles.container, styles.safe]}>
        <LogoHeader />

        <View style={styles.heroCard}>
          <View style={styles.heroTop}>
            <TouchableOpacity
              activeOpacity={0.92}
              style={styles.iconButton}
              onPress={() => goBackSmart({ fallbackHref: HOME_ROUTE })}
            >
              <Ionicons name="chevron-back" size={18} color={colors.text} />
            </TouchableOpacity>

            <View style={styles.heroCopy}>
              <Text style={styles.eyebrow}>Outdoor run</Text>
              <Text style={styles.title}>Pick the run type</Text>
              <Text style={styles.subtitle}>
                Open stays simple. Interval gets its own setup flow. The rest use the open live tracker for now.
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.listScroll}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        >
          {OUTDOOR_RUN_TYPES.map((option) => (
            <RunTypeCard
              key={option.key}
              option={option}
              styles={styles}
              colors={colors}
              onPress={() => {
                if (option.key === 'interval') {
                  router.push('/add/Cardio/outdoor/interval/Setup');
                  return;
                }

                router.push({
                  pathname: '/add/Cardio/outdoor/OutdoorSession',
                  params: {
                    title: getOutdoorRunTitle(option.key),
                    activityType: 'run',
                    runSubtype: option.key,
                  },
                });
              }}
            />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

function RunTypeCard({
  option,
  styles,
  colors,
  onPress,
}: {
  option: OutdoorRunTypeOption;
  styles: ReturnType<typeof createStyles>;
  colors: ReturnType<typeof useAppTheme>['colors'];
  onPress: () => void;
}) {
  const accentColor =
    option.accentTone === 'primary'
      ? colors.highlight1
      : option.accentTone === 'secondary'
        ? colors.highlight2
        : colors.highlight3;
  const accentSurface =
    option.accentTone === 'primary'
      ? colors.accentSoft
      : option.accentTone === 'secondary'
        ? colors.accentSecondarySoft
        : colors.accentTertiarySoft;

  return (
    <TouchableOpacity activeOpacity={0.92} style={styles.card} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: accentSurface }]}>
        <Ionicons name={option.icon} size={20} color={accentColor} />
      </View>

      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle}>{option.label}</Text>
        <Text style={styles.cardDetail}>{option.detail}</Text>
      </View>

      <Ionicons name="arrow-forward" size={18} color={accentColor} />
    </TouchableOpacity>
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
    safe: {
      flex: 1,
    },
    heroCard: {
      marginTop: 8,
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 28,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 20,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    iconButton: {
      width: 40,
      height: 40,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroCopy: {
      flex: 1,
    },
    eyebrow: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.9,
      textTransform: 'uppercase',
    },
    title: {
      marginTop: 8,
      color: colors.highlight1,
      fontFamily: fonts.display,
      fontSize: 28,
      lineHeight: 32,
      letterSpacing: -0.8,
    },
    subtitle: {
      marginTop: 8,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 19,
      maxWidth: 280,
    },
    listScroll: {
      flex: 1,
      marginTop: 14,
    },
    listContent: {
      paddingBottom: 18,
      gap: 10,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      backgroundColor: HOME_TONES.surface1,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 16,
    },
    iconWrap: {
      width: 48,
      height: 48,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardCopy: {
      flex: 1,
    },
    cardTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 20,
    },
    cardDetail: {
      marginTop: 5,
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
    },
  });
}
