import React, { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';
import { HOME_TONES } from './tokens';

export type RunWalkExerciseType =
  | 'outdoor_run'
  | 'outdoor_walk'
  | 'indoor_run'
  | 'indoor_walk';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSelect: (type: RunWalkExerciseType) => void;
};

export default function RunWalkTypeModal({ visible, onClose, onSelect }: Props) {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <AppPopup
      visible={visible}
      onClose={onClose}
      eyebrow="Session Type"
      title="Start run or walk"
      subtitle="The selected home theme is also driving this modal."
      showCloseButton
    >
      <View style={styles.list}>
        <OptionRow
          icon="walk-outline"
          iconColor={colors.highlight1}
          iconBg={colors.accentSoft}
          label="Outdoor Run"
          detail="GPS route, outdoor pace, and distance."
          onPress={() => onSelect('outdoor_run')}
          styles={styles}
        />
        <OptionRow
          icon="footsteps-outline"
          iconColor={colors.highlight3}
          iconBg={colors.accentTertiarySoft}
          label="Outdoor Walk"
          detail="Track a lower-intensity outdoor session."
          onPress={() => onSelect('outdoor_walk')}
          styles={styles}
        />
        <OptionRow
          icon="speedometer-outline"
          iconColor={colors.highlight2}
          iconBg={colors.accentSecondarySoft}
          label="Indoor Run"
          detail="Treadmill-style tracking without GPS."
          onPress={() => onSelect('indoor_run')}
          styles={styles}
        />
        <OptionRow
          icon="analytics-outline"
          iconColor={colors.highlight2}
          iconBg={colors.accentSecondarySoft}
          label="Indoor Walk"
          detail="Quick indoor walking session flow."
          onPress={() => onSelect('indoor_walk')}
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
  iconColor,
  iconBg,
  onPress,
  styles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  iconColor: string;
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
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>

      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowDetail}>{detail}</Text>
      </View>

      <Ionicons name="arrow-forward" size={18} color={iconColor} />
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
