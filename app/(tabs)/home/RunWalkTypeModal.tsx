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
  const { colors, fonts, globalStyles } = useAppTheme();
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
          globalStyles={globalStyles}
        />
        <OptionRow
          icon="footsteps-outline"
          iconColor={colors.highlight3}
          iconBg={colors.accentTertiarySoft}
          label="Outdoor Walk"
          detail="Track a lower-intensity outdoor session."
          onPress={() => onSelect('outdoor_walk')}
          styles={styles}
          globalStyles={globalStyles}
        />
        <OptionRow
          icon="speedometer-outline"
          iconColor={colors.highlight2}
          iconBg={colors.accentSecondarySoft}
          label="Indoor Run"
          detail="Treadmill-style tracking without GPS."
          onPress={() => onSelect('indoor_run')}
          styles={styles}
          globalStyles={globalStyles}
        />
        <OptionRow
          icon="analytics-outline"
          iconColor={colors.highlight2}
          iconBg={colors.accentSecondarySoft}
          label="Indoor Walk"
          detail="Quick indoor walking session flow."
          onPress={() => onSelect('indoor_walk')}
          styles={styles}
          globalStyles={globalStyles}
        />
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[globalStyles.buttonSecondary, styles.closeButton]}
        onPress={onClose}
      >
        <Text style={globalStyles.buttonTextSecondary}>Close</Text>
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
  globalStyles,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  detail: string;
  iconColor: string;
  iconBg: string;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
  globalStyles: ReturnType<typeof useAppTheme>['globalStyles'];
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[globalStyles.panelSoft, styles.row]}
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
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    rowDetail: {
      color: colors.textMuted,
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
