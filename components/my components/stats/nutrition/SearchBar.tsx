// components/my components/meals/SearchBar.tsx
import React, { useMemo } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useAppTheme } from '@/providers/AppThemeProvider';

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (txt: string) => void;
  onClear?: () => void;
};

const SearchBar: React.FC<Props> = ({ placeholder = 'Search', value, onChangeText, onClear }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const showClear = !!value?.length;

  return (
    <View style={styles.searchBox}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={colors.textOffSt}
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        accessibilityLabel="Search meals"
      />
      {showClear && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Clear search"
          onPress={onClear}
          style={styles.clearBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.clearTxt}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

export default SearchBar;

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    searchBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card2,
      borderColor: colors.border,
      borderWidth: 1,
      marginHorizontal: 16,
      borderRadius: 12,
      paddingHorizontal: 12,
      height: 44,
      marginBottom: 8,
    },
    searchInput: { flex: 1, color: colors.text, fontFamily: fonts.body },
    clearBtn: {
      height: 28,
      minWidth: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: colors.card3,
    },
    clearTxt: { color: colors.textMuted, fontSize: 14, fontFamily: fonts.heading },
  });
}
