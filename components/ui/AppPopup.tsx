import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';

type AppPopupProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  footer?: React.ReactNode;
  align?: 'center' | 'bottom';
  dismissOnBackdrop?: boolean;
  showCloseButton?: boolean;
  animationType?: 'none' | 'slide' | 'fade';
  contentStyle?: StyleProp<ViewStyle>;
  bodyStyle?: StyleProp<ViewStyle>;
  headerRight?: React.ReactNode;
};

export default function AppPopup({
  visible,
  onClose,
  children,
  eyebrow,
  title,
  subtitle,
  footer,
  align = 'center',
  dismissOnBackdrop = true,
  showCloseButton = false,
  animationType = 'fade',
  contentStyle,
  bodyStyle,
  headerRight,
}: AppPopupProps) {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType={animationType}
      onRequestClose={onClose}
    >
      <Pressable
        style={[styles.backdrop, align === 'bottom' ? styles.backdropBottom : null]}
        onPress={dismissOnBackdrop ? onClose : undefined}
      >
        <Pressable
          style={[
            globalStyles.panel,
            styles.card,
            align === 'bottom' ? styles.cardBottom : null,
            contentStyle,
          ]}
          onPress={() => {}}
        >
          {eyebrow || title || subtitle || showCloseButton || headerRight ? (
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                {eyebrow ? <Text style={globalStyles.eyebrow}>{eyebrow}</Text> : null}
                {title ? <Text style={styles.title}>{title}</Text> : null}
                {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
              </View>

              {headerRight ? (
                headerRight
              ) : showCloseButton ? (
                <TouchableOpacity
                  activeOpacity={0.92}
                  style={styles.closeButton}
                  onPress={onClose}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={bodyStyle}>{children}</View>

          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
    },
    backdropBottom: {
      justifyContent: 'flex-end',
      paddingHorizontal: 0,
      paddingBottom: 0,
    },
    card: {
      width: '100%',
      gap: 0,
    },
    cardBottom: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      width: '100%',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    headerCopy: {
      flex: 1,
    },
    title: {
      marginTop: 8,
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 24,
      lineHeight: 28,
      letterSpacing: -0.6,
    },
    subtitle: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      marginTop: 18,
    },
  });
}
