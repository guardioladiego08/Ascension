// components/my components/activities/add meal/FromRecipePopup.tsx
// -----------------------------------------------------------------------------
// PURPOSE
// A popup modal that lets the user pick one or multiple saved meals (recipes)
// from their personal library and add them to the current day's meal list.
// It includes:
//   • A search bar to filter saved meals by name
//   • A small “alpha hint + underline” row to match your mock
//   • A scrollable list of saved meals with a selectable circular check
//   • An ADD button that returns the selected meals to the parent via onAddMeals
// -----------------------------------------------------------------------------

import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AM_COLORS as C } from './theme'; // App-specific color palette
import Popup from './Popup'; // Reusable modal wrapper component for consistent look/feel
import { MaterialIcons } from '@expo/vector-icons'; // Icon set used for search and checkmarks
import {
  MealData,
  useSavedMeals,
} from '../../../../assets/data/savedMealStore'; // Hook to read saved meals
import { GlobalStyles } from '@/constants/GlobalStyles'; // Shared text styles (e.g., bold, subtext)
import { Colors } from '@/constants/Colors';
/**
 * Props expected by FromRecipePopup.
 * - visible: controls whether the popup is shown.
 * - onClose: called when user dismisses the popup.
 * - onAddMeals: called with an array of selected MealData to add to a day.
 */
type Props = {
  visible: boolean;
  onClose: () => void;
  onAddMeals: (meals: MealData[]) => void; // parent will add them to "meals per day index"
};

/**
 * FromRecipePopup
 * A controlled popup that reads the user's saved meals, lets them filter
 * with a search query, multi-select rows, and then emits the selection
 * back to the parent via onAddMeals when "ADD" is pressed.
 */
const FromRecipePopup: React.FC<Props> = ({ visible, onClose, onAddMeals }) => {
  // Pull the up-to-date list of all saved meals from global store / hook.
  const savedMeals = useSavedMeals();

  // q: the search query typed by the user in the search bar
  const [q, setQ] = useState('');

  // selectedIds: lookup table of meal.id -> boolean (selected or not)
  // Using a record allows O(1) reads/writes and easy toggling.
  const [selectedIds, setSelectedIds] = useState<Record<string, boolean>>({});

  /**
   * filtered
   * Memoized subset of savedMeals based on the current query 'q'.
   * - Trims and lowercases the query for case-insensitive matching.
   * - If query is empty, returns the full list.
   */
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return savedMeals;
    return savedMeals.filter((m) => m.name.toLowerCase().includes(needle));
  }, [q, savedMeals]);

  /**
   * toggle
   * Inverts the selection state of a given meal id.
   * Uses the functional setState form to ensure updates are based on
   * the latest state snapshot.
   */
  const toggle = (id: string) =>
    setSelectedIds((prev) => ({ ...prev, [id]: !prev[id] }));

  /**
   * selectedMeals
   * Derives the actual MealData objects that are currently selected.
   * We filter over the *filtered* array so that if the user has narrowed
   * the list, the checkmarks reflect only visible items. (Checked items
   * not in the current filter won't render, but remain in selectedIds.)
   */
  const selectedMeals = useMemo(
    () => filtered.filter((m) => selectedIds[m.id]),
    [filtered, selectedIds]
  );

  /**
   * addSelected
   * If there are any selected meals, call onAddMeals with the selected array,
   * clear the selection state for a fresh start next open, and close the popup.
   */
  const addSelected = () => {
    if (selectedMeals.length === 0) return; // No-op if nothing selected
    onAddMeals(selectedMeals);
    setSelectedIds({});
    onClose();
  };

  // RENDER
  return (
    // Popup is your app's modal wrapper. It handles visibility & close behavior.
    <Popup visible={visible} onClose={onClose} title="ADD NEW MEAL">
      <View style={styles.container}>
        {/* ------------------------------------------------------------------
            Search Bar
            - Row with a search icon and a TextInput
            - Light background with rounded corners to stand out in the popup
          ------------------------------------------------------------------ */}
        <View style={styles.searchRow}>
          <MaterialIcons
            name="search"
            size={18}
            color="#333"
            style={{ marginRight: 6 }}
          />
          <TextInput
            placeholder="SEARCH"
            placeholderTextColor="#777"
            value={q}
            onChangeText={setQ}
            style={styles.searchInput}
            // Optional: returnKeyType="search"
          />
        </View>

        {/* ------------------------------------------------------------------
            Alpha hint + underline
            - Matches your mock that shows a small character ('B') and a line.
            - Decorative: not used for sorting; purely visual.
          ------------------------------------------------------------------ */}
        <View style={styles.alphaRow}>
          <Text style={styles.alphaChar}>B</Text>
          <View style={styles.alphaLine} />
        </View>

        {/* ------------------------------------------------------------------
            List of meals
            - FlatList for efficient, scrollable rendering
            - Keyed by meal.id
            - Pressing a row toggles its selection
            - Shows macros and a circular "check" indicator on the right
          ------------------------------------------------------------------ */}
        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          style={{ marginTop: 8 }}
          renderItem={({ item }) => {
            const checked = !!selectedIds[item.id]; // Coerce undefined -> false
            return (
              <TouchableOpacity
                style={styles.mealRow}
                onPress={() => toggle(item.id)}
                activeOpacity={0.8}
                // accessibilityRole and accessibilityState help screen readers
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
              >
                {/* Left side: meal name and macro summary */}
                <View style={{ flex: 1 }}>
                  {/* Uppercasing for strong visual hierarchy */}
                  <Text style={GlobalStyles.textBold}>
                    {item.name.toUpperCase()}
                  </Text>

                  {/* Macro line: P / C / F values displayed in grams */}
                  <Text style={GlobalStyles.subtext}>
                    P {item.totals.protein}G   C {item.totals.carbs}G   F{' '}
                    {item.totals.fats}G
                  </Text>
                </View>

                {/* Right side: circular check indicator */}
                <View style={styles.circle}>
                  {/* If selected, render a MaterialIcons 'check'; otherwise render empty */}
                  <MaterialIcons
                    name={checked ? 'check' : undefined}
                    size={16}
                    color={checked ? '#2d2d2d' : '#ddd'}
                  />
                </View>
              </TouchableOpacity>
            );
          }}
          // If there are no saved meals (or filter removes all), show an empty state.
          ListEmptyComponent={
            <Text style={styles.empty}>
              No saved meals yet. Create one first!
            </Text>
          }
        />

        {/* ------------------------------------------------------------------
            ADD button
            - Enabled only when the user has selected at least one meal
            - Calls addSelected to emit selection and close
          ------------------------------------------------------------------ */}
        <TouchableOpacity
          style={[
            styles.addBtn,
            selectedMeals.length === 0 && { opacity: 0.5 }, // Visual disable
          ]}
          onPress={addSelected}
          disabled={selectedMeals.length === 0}
          accessibilityRole="button"
          accessibilityState={{ disabled: selectedMeals.length === 0 }}
        >
          <Text style={styles.addText}>ADD</Text>
        </TouchableOpacity>
      </View>
    </Popup>
  );
};

export default FromRecipePopup;

/* =============================================================================
   STYLES
   Centralized style objects for layout, spacing, and colors.
   Notes:
   - Background/line colors reference your AM_COLORS palette where relevant.
   - Aim to keep padding consistent with other popups for visual harmony.
============================================================================= */
const styles = StyleSheet.create({
  // Outer padding for the content area within the Popup
  container: { paddingHorizontal: 6, paddingBottom: 8 },

  // Search bar container styles: horizontal row with icon + input
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E9E9E9',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },

  // Search input expands to fill remaining row space
  searchInput: { flex: 1, color: '#222', fontSize: 14 },

  // Decorative alpha row with a bold letter and a thin line across
  alphaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  alphaChar: { color: C.highlight1, fontWeight: '900', marginRight: 8 },
  alphaLine: { flex: 1, height: 1, backgroundColor: C.line },

  // Vertical gap between list items
  sep: { height: 8 },

  // Individual meal row: dark chip-like card with rounded corners
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6E6E6E',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },

  // (unused in render; kept for reference if you prefer direct style vs GlobalStyles)
  mealName: { color: C.text, fontWeight: '800', letterSpacing: 0.5 },
  subMacros: { color: C.text, opacity: 0.9, marginTop: 4, fontSize: 12 },

  // Right-side circular check indicator
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#CFCFCF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    backgroundColor: '#FF950A20', // subtle orangish tint to match brand accent
  },

  // ADD button styling: bright brand color, rounded pill
  addBtn: {
    marginTop: 10,
    backgroundColor: Colors.dark.highlight1,
    borderRadius: 14,
    alignSelf: 'center',
    paddingHorizontal: 26,
    paddingVertical: 8,
  },

  // ADD button text: dark foreground for contrast on orange background
  addText: { color: '#2d2d2d', fontWeight: '900', letterSpacing: 1 },

  // Empty state styling for the FlatList when no results
  empty: { color: C.muted, alignSelf: 'center', marginTop: 16 },
});
