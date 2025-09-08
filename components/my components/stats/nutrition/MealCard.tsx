// components/my components/meals/MealCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '@/constants/Colors';
import MacroBar from './MacroBar';
import { MealItem } from '@/assets/data/mealsData';

type Props = { item: MealItem };

const MealCard: React.FC<Props> = ({ item }) => {
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

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#4A4A4A',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  mealTitle: {
    color: Colors.dark.text,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mealSubtitle: {
    color: Colors.dark.text,
    opacity: 0.9,
    marginTop: 4,
    marginBottom: 10,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  rightCol: { marginLeft: 16, alignItems: 'flex-end', justifyContent: 'space-between' },
  dateTxt: { color: Colors.dark.text, fontSize: 12, fontWeight: '700' },
  calLabel: { color: Colors.dark.text, fontSize: 12, fontWeight: '700', opacity: 0.9 },
  calories: { color: Colors.dark.highlight1, fontSize: 18, fontWeight: '900' },
});
