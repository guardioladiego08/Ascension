// components/my components/meals/SearchBar.tsx
import React from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Colors } from '@/constants/Colors';

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (txt: string) => void;
  onClear?: () => void;
};

const SearchBar: React.FC<Props> = ({ placeholder = 'Search', value, onChangeText, onClear }) => {
  const showClear = !!value?.length;

  return (
    <View style={styles.searchBox}>
      <TextInput
        placeholder={placeholder}
        placeholderTextColor="#9B9B9B"
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

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDEDED',
    marginHorizontal: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  searchInput: { flex: 1, color: '#111' },
  clearBtn: {
    height: 28,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#d0d0d0',
  },
  clearTxt: { color: '#222', fontSize: 14, fontWeight: '800' },
});
