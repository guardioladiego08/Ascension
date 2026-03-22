// components/my components/meals/MacroPill.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = { label: string };

const MacroPill: React.FC<Props> = ({ label }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.macroPill}>
      <Text style={styles.macroPillText}>{label}</Text>
    </View>
  );
};

export default MacroPill;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    macroPill: {
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 10,
      marginTop: 6,
    },
    macroPillText: {
      fontSize: 11,
      fontFamily: fonts.heading,
      color: colors.text,
    },
  });
}
