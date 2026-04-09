import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import { useAppTheme } from '@/providers/AppThemeProvider';

import ProgressPlaceholderPanels from './progress/components/ProgressPlaceholderPanels';
import ProgressTopTabs from './progress/components/ProgressTopTabs';
import { PROGRESS_TABS } from './progress/components/progressTabs';

// Progress landing note:
// The previous dashboard composition on this route has been intentionally retired.
// Treat this top-tab scaffold and its local components as the source of truth for future progress-page work.

const ProgressScreen: React.FC = () => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const { width: windowWidth } = useWindowDimensions();

  const [activeIndex, setActiveIndex] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const animatedIndex = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedIndex, {
      toValue: activeIndex,
      stiffness: 240,
      damping: 26,
      mass: 0.9,
      useNativeDriver: true,
    }).start();
  }, [activeIndex, animatedIndex]);

  const viewportWidth = Math.max(contentWidth || windowWidth - 36, 0);

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.9, y: 1 }}
      style={globalStyles.page}
    >
      <ScrollView
        contentContainerStyle={[globalStyles.container, styles.content]}
        showsVerticalScrollIndicator={false}
      >
        <LogoHeader />

        <View
          onLayout={(event: LayoutChangeEvent) => {
            const width = Math.floor(event.nativeEvent.layout.width);
            if (width && width !== contentWidth) {
              setContentWidth(width);
            }
          }}
          style={styles.tabsSection}
        >
          <ProgressTopTabs
            tabs={PROGRESS_TABS}
            activeIndex={activeIndex}
            animatedIndex={animatedIndex}
            onSelect={setActiveIndex}
            width={viewportWidth}
          />

          <ProgressPlaceholderPanels
            tabs={PROGRESS_TABS}
            animatedIndex={animatedIndex}
            width={viewportWidth}
          />
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    content: {
      paddingBottom: 90,
    },
    heroCard: {
      marginTop: 10,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.display,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -1,
    },
    subtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
      maxWidth: 320,
    },
    tabsSection: {
      marginTop: 0,
    },
    bottomSpacer: {
      height: 24,
    },
  });
}

export default ProgressScreen;
