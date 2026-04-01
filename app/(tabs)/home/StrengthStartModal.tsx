import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';

import { HOME_TONES } from './tokens';

export type StrengthStartMode = 'freestyle' | 'template';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (mode: StrengthStartMode) => void;
};

export default function StrengthStartModal({ visible, onClose, onSelect }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      eyebrow="Strength Setup"
      title="How do you want to start?"
      subtitle="Jump into a blank lifting session or load one of your saved workout templates."
      showCloseButton
    >
      <View style={styles.list}>
        <OptionRow
          icon={
            <MaterialCommunityIcons
              name="dumbbell"
              size={18}
              color={colors.highlight1}
            />
          }
          iconBg={colors.accentSoft}
          label="Start freestyle"
          detail="Open the current strength logger and build the workout as you go."
          onPress={() => onSelect('freestyle')}
          styles={styles}
        />

        <OptionRow
          icon={<Ionicons name="copy-outline" size={18} color={colors.highlight3} />}
          iconBg={colors.accentTertiarySoft}
          label="Choose template"
          detail="Start from saved exercise order and set counts, then log today’s weights and reps."
          onPress={() => onSelect('template')}
          styles={styles}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[styles.buttonSecondary, styles.closeButton]}
        onPress={onClose}
      >
        <Text style={styles.buttonTextSecondary}>Close</Text>
      </TouchableOpacity>
    </AppPopup>
  );
}

function OptionRow({
  icon,
  label,
  detail,
  iconBg,
  onPress,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
  iconBg: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.panelSoft, styles.row]}
      onPress={onPress}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>{icon}</View>

      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>

      <Ionicons name="arrow-forward" size={18} color={HOME_TONES.textSecondary} />
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    panelSoft: {
      backgroundColor: HOME_TONES.surface2,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      padding: 18,
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
    buttonTextSecondary: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    list: {
      gap: 10,
      marginTop: 18,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      padding: 14,
    },
    rowIcon: {
      width: 40,
      height: 40,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowCopy: {
      flex: 1,
    },
    rowTitle: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    rowDetail: {
      color: HOME_TONES.textSecondary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 18,
      marginTop: 4,
    },
    closeButton: {
      marginTop: 16,
    },
  });
}
