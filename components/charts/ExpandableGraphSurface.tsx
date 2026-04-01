import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export type ExpandableGraphSurfaceRenderProps = {
  width: number;
  height: number;
  mode: 'inline' | 'expanded';
  isExpanded: boolean;
};

type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type Props = {
  children: (props: ExpandableGraphSurfaceRenderProps) => React.ReactNode;
  style?: StyleProp<ViewStyle>;
  surfaceStyle?: StyleProp<ViewStyle>;
  expandedSurfaceStyle?: StyleProp<ViewStyle>;
  overlayColor?: string;
  actionBackgroundColor?: string;
  actionIconColor?: string;
  disabled?: boolean;
  actionPosition?: 'bottom-right' | 'top-right';
  expandedActionPosition?:
    | 'bottom-right'
    | 'top-right'
    | 'middle-right'
    | 'rotated-top-right';
  rotateExpandedContent?: boolean;
};

const SCREEN_PADDING = 14;
const ACTION_SIZE = 40;
const ACTION_OFFSET = 12;
const DEFAULT_OVERLAY = 'rgba(3, 7, 18, 0.88)';

export default function ExpandableGraphSurface({
  children,
  style,
  surfaceStyle,
  expandedSurfaceStyle,
  overlayColor = DEFAULT_OVERLAY,
  actionBackgroundColor = 'rgba(255,255,255,0.12)',
  actionIconColor = '#F8FAFC',
  disabled = false,
  actionPosition = 'bottom-right',
  expandedActionPosition,
  rotateExpandedContent = false,
}: Props) {
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const surfaceRef = useRef<View>(null);
  const progress = useRef(new Animated.Value(0)).current;

  const [inlineLayout, setInlineLayout] = useState({ width: 0, height: 0 });
  const [originRect, setOriginRect] = useState<Rect | null>(null);
  const [overlayVisible, setOverlayVisible] = useState(false);

  const targetRect = useMemo<Rect>(() => {
    const safeTop = Math.max(insets.top, 10);
    const safeBottom = Math.max(insets.bottom, 10);

    return {
      x: SCREEN_PADDING,
      y: safeTop + SCREEN_PADDING,
      width: Math.max(windowWidth - SCREEN_PADDING * 2, 0),
      height: Math.max(
        windowHeight - safeTop - safeBottom - SCREEN_PADDING * 2,
        0
      ),
    };
  }, [insets.bottom, insets.top, windowHeight, windowWidth]);

  const runTransition = useCallback(
    (toValue: 0 | 1, onDone?: () => void) => {
      Animated.timing(progress, {
        toValue,
        duration: 380,
        easing: Easing.bezier(0.2, 0.9, 0.2, 1),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          onDone?.();
        }
      });
    },
    [progress]
  );

  const measureSurface = useCallback(
    (onMeasured: (rect: Rect) => void) => {
      surfaceRef.current?.measureInWindow((x, y, width, height) => {
        if (!width || !height) {
          return;
        }

        onMeasured({ x, y, width, height });
      });
    },
    []
  );

  const handleExpand = useCallback(() => {
    if (disabled) {
      return;
    }

    measureSurface((rect) => {
      progress.stopAnimation();
      progress.setValue(0);
      setOriginRect(rect);
      setOverlayVisible(true);
      runTransition(1);
    });
  }, [disabled, measureSurface, progress, runTransition]);

  const handleCollapse = useCallback(() => {
    progress.stopAnimation();
    let settled = false;

    surfaceRef.current?.measureInWindow((x, y, width, height) => {
      settled = true;

      if (width && height) {
        setOriginRect({ x, y, width, height });
      }

      runTransition(0, () => {
        setOverlayVisible(false);
      });
    });

    if (!surfaceRef.current && !settled) {
      runTransition(0, () => {
        setOverlayVisible(false);
      });
    }
  }, [progress, runTransition]);

  const animatedSurfaceStyle = useMemo(() => {
    if (!originRect) {
      return null;
    }

    return {
      left: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originRect.x, targetRect.x],
      }),
      top: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originRect.y, targetRect.y],
      }),
      width: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originRect.width, targetRect.width],
      }),
      height: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [originRect.height, targetRect.height],
      }),
      borderRadius: progress.interpolate({
        inputRange: [0, 1],
        outputRange: [24, 30],
      }),
      transform: [
        { perspective: 1200 },
        {
          rotateX: progress.interpolate({
            inputRange: [0, 0.35, 1],
            outputRange: ['0deg', '8deg', '0deg'],
          }),
        },
        {
          rotateZ: progress.interpolate({
            inputRange: [0, 0.35, 1],
            outputRange: ['0deg', '-2.5deg', '0deg'],
          }),
        },
      ],
    };
  }, [originRect, progress, targetRect.height, targetRect.width, targetRect.x, targetRect.y]);

  const overlayOpacity = useMemo(
    () =>
      progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
      }),
    [progress]
  );

  const expandedContentSize = useMemo(
    () => ({
      width: rotateExpandedContent ? targetRect.height : targetRect.width,
      height: rotateExpandedContent ? targetRect.width : targetRect.height,
    }),
    [rotateExpandedContent, targetRect.height, targetRect.width]
  );

  return (
    <View style={style}>
      <View
        ref={surfaceRef}
        collapsable={false}
        onLayout={(event) => {
          const { width, height } = event.nativeEvent.layout;
          if (
            Math.round(width) !== Math.round(inlineLayout.width) ||
            Math.round(height) !== Math.round(inlineLayout.height)
          ) {
            setInlineLayout({ width, height });
          }
        }}
        style={[styles.surface, surfaceStyle]}
      >
        {children({
          width: inlineLayout.width,
          height: inlineLayout.height,
          mode: 'inline',
          isExpanded: false,
        })}

        {!disabled ? (
          <GraphActionButton
            expanded={false}
            backgroundColor={actionBackgroundColor}
            iconColor={actionIconColor}
            onPress={handleExpand}
            position={actionPosition}
          />
        ) : null}
      </View>

      <Modal
        animationType="none"
        onRequestClose={handleCollapse}
        statusBarTranslucent
        transparent
        visible={overlayVisible && !!originRect}
      >
        <View style={StyleSheet.absoluteFill}>
          <Animated.View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFillObject,
              {
                backgroundColor: overlayColor,
                opacity: overlayOpacity,
              },
            ]}
          />
          <Pressable onPress={handleCollapse} style={StyleSheet.absoluteFillObject} />

          {originRect && animatedSurfaceStyle ? (
            <Animated.View
              style={[
                styles.surface,
                styles.overlaySurface,
                surfaceStyle,
                expandedSurfaceStyle,
                animatedSurfaceStyle,
              ]}
            >
              <View style={styles.expandedContentFrame}>
                <View
                  style={[
                    styles.expandedContentInner,
                    rotateExpandedContent ? styles.expandedContentRotated : null,
                    rotateExpandedContent
                      ? {
                          width: expandedContentSize.width,
                          height: expandedContentSize.height,
                        }
                      : styles.expandedContentFill,
                  ]}
                >
                  {children({
                    width: expandedContentSize.width,
                    height: expandedContentSize.height,
                    mode: 'expanded',
                    isExpanded: true,
                  })}
                </View>
              </View>

              <GraphActionButton
                expanded
                backgroundColor={actionBackgroundColor}
                iconColor={actionIconColor}
                onPress={handleCollapse}
                position={expandedActionPosition ?? actionPosition}
              />
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

function GraphActionButton({
  expanded,
  backgroundColor,
  iconColor,
  onPress,
  position,
}: {
  expanded: boolean;
  backgroundColor: string;
  iconColor: string;
  onPress: () => void;
  position: 'bottom-right' | 'top-right' | 'middle-right' | 'rotated-top-right';
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      style={[
        styles.actionButton,
        position === 'top-right'
          ? styles.actionButtonTopRight
          : position === 'middle-right'
            ? styles.actionButtonMiddleRight
            : position === 'rotated-top-right'
              ? styles.actionButtonRotatedTopRight
            : styles.actionButtonBottomRight,
        { backgroundColor },
      ]}
    >
      <Ionicons
        color={iconColor}
        name={expanded ? 'contract-outline' : 'expand-outline'}
        size={18}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  surface: {
    overflow: 'hidden',
    width: '100%',
  },
  overlaySurface: {
    position: 'absolute',
    shadowColor: '#020617',
    shadowOpacity: 0.36,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  expandedContentFrame: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedContentInner: {
    width: '100%',
    height: '100%',
  },
  expandedContentFill: {
    width: '100%',
    height: '100%',
  },
  expandedContentRotated: {
    transform: [{ rotate: '90deg' }],
  },
  actionButton: {
    position: 'absolute',
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  actionButtonBottomRight: {
    right: ACTION_OFFSET,
    bottom: ACTION_OFFSET,
  },
  actionButtonTopRight: {
    right: ACTION_OFFSET,
    top: ACTION_OFFSET,
  },
  actionButtonMiddleRight: {
    right: ACTION_OFFSET,
    top: '50%',
    marginTop: -(ACTION_SIZE / 2),
  },
  actionButtonRotatedTopRight: {
    left: ACTION_OFFSET,
    top: ACTION_OFFSET,
    transform: [{ rotate: '-90deg' }],
  },
});
