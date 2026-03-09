import React, { useMemo } from 'react';
import {
  Image,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { withAlpha } from '@/constants/Colors';
import { useAppTheme } from '@/providers/AppThemeProvider';

type AuthScreenProps = {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  showBackButton?: boolean;
  backTo?: string;
  backHref?: Href;
  backReplace?: boolean;
  onBackPress?: () => void;
  scrollable?: boolean;
  contentContainerStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  footer?: React.ReactNode;
  headerRight?: React.ReactNode;
};

export default function AuthScreen({
  children,
  eyebrow,
  title,
  subtitle,
  showBackButton = false,
  backTo,
  backHref,
  backReplace = true,
  onBackPress,
  scrollable = true,
  contentContainerStyle,
  bodyStyle,
  footer,
  headerRight,
}: AuthScreenProps) {
  const router = useRouter();
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }

    if (backHref) {
      if (backReplace) router.replace(backHref);
      else router.push(backHref);
      return;
    }

    if (backTo) {
      if (backReplace) router.replace(backTo as any);
      else router.push(backTo as any);
      return;
    }

    router.back();
  };

  const header = (
    <View style={styles.headerBlock}>
      <View style={styles.brandRow}>
        {showBackButton ? (
          <TouchableOpacity
            accessibilityRole="button"
            activeOpacity={0.92}
            style={styles.iconButton}
            onPress={handleBack}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconSpacer} />
        )}

        <View style={styles.logoWrap}>
          <Image
            source={require('@/assets/images/TensrLogo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {headerRight ? <View style={styles.headerRight}>{headerRight}</View> : <View style={styles.iconSpacer} />}
      </View>

      <View style={styles.copyBlock}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );

  const body = (
    <>
      {header}
      <View style={[styles.body, bodyStyle]}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </>
  );

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={styles.gradient}
    >
      <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
        {scrollable ? (
          <ScrollView
            contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {body}
          </ScrollView>
        ) : (
          <View style={[styles.staticContent, contentContainerStyle]}>{body}</View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    gradient: {
      flex: 1,
    },
    safeArea: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 8,
      flexGrow: 1,
    },
    staticContent: {
      flex: 1,
      paddingHorizontal: 20,
      paddingBottom: 32,
      paddingTop: 8,
    },
    headerBlock: {
      gap: 18,
    },
    brandRow: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: withAlpha(colors.surfaceRaised, 0.9),
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconSpacer: {
      width: 44,
      height: 44,
    },
    logoWrap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    logo: {
      width: 84,
      height: 84,
    },
    headerRight: {
      minWidth: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
      marginLeft: 8,
    },
    copyBlock: {
      gap: 8,
    },
    eyebrow: {
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 16,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
    },
    title: {
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -1,
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: 420,
    },
    body: {
      flex: 1,
      marginTop: 24,
    },
    footer: {
      marginTop: 18,
    },
  });
}
