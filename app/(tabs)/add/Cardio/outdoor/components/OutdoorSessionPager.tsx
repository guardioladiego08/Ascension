import React, { useMemo, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { HOME_TONES } from '@/app/(tabs)/home/tokens';
import { useAppTheme } from '@/providers/AppThemeProvider';

type PagerPage = {
  key: string;
  label: string;
  content: React.ReactNode;
};

type Props = {
  pages: PagerPage[];
};

export default function OutdoorSessionPager({ pages }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const scrollRef = useRef<ScrollView | null>(null);
  const [pageWidth, setPageWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);

  function onLayout(event: LayoutChangeEvent) {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth > 0 && nextWidth !== pageWidth) {
      setPageWidth(nextWidth);
    }
  }

  function jumpToPage(index: number) {
    if (!scrollRef.current || pageWidth <= 0) {
      setActiveIndex(index);
      return;
    }

    scrollRef.current.scrollTo({ x: index * pageWidth, animated: true });
    setActiveIndex(index);
  }

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      <View style={styles.navRow}>
        <View style={styles.pillRow}>
          {pages.map((page, index) => {
            const active = index === activeIndex;
            return (
              <TouchableOpacity
                key={page.key}
                activeOpacity={0.92}
                style={[styles.navPill, active ? styles.navPillActive : null]}
                onPress={() => jumpToPage(index)}
              >
                <Text style={[styles.navText, active ? styles.navTextActive : null]}>
                  {page.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Text style={styles.hint}>Swipe sideways</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onMomentumScrollEnd={(event) => {
          if (pageWidth <= 0) return;
          const nextIndex = Math.round(event.nativeEvent.contentOffset.x / pageWidth);
          setActiveIndex(Math.max(0, Math.min(pages.length - 1, nextIndex)));
        }}
      >
        {pages.map((page) => (
          <View
            key={page.key}
            style={[
              styles.page,
              pageWidth > 0 ? { width: pageWidth } : styles.pageFallback,
            ]}
          >
            {page.content}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      flex: 1,
      gap: 12,
    },
    navRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    pillRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    navPill: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    navPillActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    navText: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    navTextActive: {
      color: colors.highlight1,
    },
    hint: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    page: {
      paddingRight: 2,
    },
    pageFallback: {
      width: '100%',
    },
  });
}
