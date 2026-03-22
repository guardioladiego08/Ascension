// components/my components/meals/MealCard.tsx
import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MacroBar from './MacroBar';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = { item: MealItem };

type MealItem = {
  title: string;
  subtitle: string;
  protein: number;
  carbs: number;
  fat: number;
  date: string;
  time: string;
  calories: number | string;
};

const MealCard: React.FC<Props> = ({ item }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  return (
    <View style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.mealTitle}>{item.title.toUpperCase()}</Text>
        <Text style={styles.mealSubtitle}>{item.subtitle}</Text>
        <MacroBar protein={item.protein} carbs={item.carbs} fat={item.fat} />
      </View>

      <View style={styles.rightCol}>
        <Text style={styles.dateTxt}>{item.date}</Text>
        <Text style={styles.dateTxt}>{item.time}</Text>

        <View style={{ marginTop: 8, alignItems: 'center' }}>
          <Text style={styles.calLabel}>CAL</Text>
          <Text style={styles.calories}>{item.calories}</Text>
        </View>
      </View>
    </View>
  );
};

export default MealCard;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.card2,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
    },
    mealTitle: {
      color: colors.text,
      fontSize: 18,
      fontFamily: fonts.heading,
      letterSpacing: 0.5,
    },
    mealSubtitle: {
      color: colors.textMuted,
      marginTop: 4,
      marginBottom: 10,
      fontSize: 12,
      lineHeight: 16,
      fontFamily: fonts.body,
      letterSpacing: 0.3,
    },
    rightCol: { marginLeft: 16, alignItems: 'flex-end', justifyContent: 'space-between' },
    dateTxt: { color: colors.text, fontSize: 12, lineHeight: 16, fontFamily: fonts.heading },
    calLabel: { color: colors.textMuted, fontSize: 12, lineHeight: 16, fontFamily: fonts.heading },
    calories: { color: colors.highlight1, fontSize: 18, lineHeight: 22, fontFamily: fonts.display },
  });
}
