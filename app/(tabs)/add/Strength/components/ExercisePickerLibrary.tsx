import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

import CustomExercisePanel from './CustomExercisePanel';
import {
  fetchVisibleExercises,
  getAuthenticatedUserId,
  getExerciseBodyParts,
  isCustomExercise,
  type ExerciseRecord,
} from '@/lib/strength/exercises';

export type ExercisePickerSelection = {
  id: string;
  exercise_name: string;
};

type ExerciseRow = ExerciseRecord;

type Props = {
  visible: boolean;
  onPick: (ex: ExercisePickerSelection) => void;
  onClose: () => void;
  tableName?: string;
  style?: StyleProp<ViewStyle>;
};

function sortExercises(items: ExerciseRow[]) {
  return [...items].sort((a, b) =>
    a.exercise_name.toLowerCase().localeCompare(b.exercise_name.toLowerCase())
  );
}

const ExercisePickerLibrary: React.FC<Props> = ({
  visible,
  onPick,
  onClose,
  tableName = 'exercises',
  style,
}) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [allItems, setAllItems] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [customPanelVisible, setCustomPanelVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const resetState = useCallback(() => {
    setAllItems([]);
    setLoading(false);
    setFetchError(null);
    setUserId(null);
    setQuery('');
    setCustomPanelVisible(false);
    setFilterVisible(false);
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
  }, []);

  const fetchAllExercises = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      if (tableName !== 'exercises') {
        throw new Error(`Unsupported exercise source: ${tableName}`);
      }

      const currentUserId = await getAuthenticatedUserId();
      if (!currentUserId) {
        throw new Error('Not signed in.');
      }

      setUserId(currentUserId);
      const rows = await fetchVisibleExercises(currentUserId);
      setAllItems(rows);
    } catch (error: any) {
      console.warn('Error fetching exercises', error);
      setFetchError(error?.message || 'Failed to fetch exercises.');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    if (!visible) {
      resetState();
      return;
    }

    resetState();
    fetchAllExercises();
  }, [fetchAllExercises, resetState, visible]);

  const allBodyParts = useMemo(() => {
    const unique = new Set<string>();
    allItems.forEach((exercise) => {
      getExerciseBodyParts(exercise).forEach((bodyPart) => unique.add(bodyPart));
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const allCategories = useMemo(() => {
    const unique = new Set<string>();
    allItems.forEach((exercise) => {
      const category = exercise.workout_category || null;
      if (category) unique.add(category);
    });
    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const filtered = useMemo(() => {
    let list = [...allItems];

    if (query.trim()) {
      const normalizedQuery = query.toLowerCase();
      list = list.filter((exercise) =>
        exercise.exercise_name.toLowerCase().includes(normalizedQuery)
      );
    }

    if (selectedBodyParts.length > 0) {
      list = list.filter((exercise) => {
        const parts = getExerciseBodyParts(exercise);
        return parts.some((part) => selectedBodyParts.includes(part));
      });
    }

    if (selectedCategory) {
      list = list.filter((exercise) => exercise.workout_category === selectedCategory);
    }

    list.sort((a, b) => {
      const left = a.exercise_name.toLowerCase();
      const right = b.exercise_name.toLowerCase();
      return sortDir === 'asc' ? left.localeCompare(right) : right.localeCompare(left);
    });

    return list;
  }, [allItems, query, selectedBodyParts, selectedCategory, sortDir]);

  const clearFilters = () => {
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
  };

  const clearSearch = () => setQuery('');

  const showInfo = (exercise: ExerciseRow) => {
    Alert.alert(exercise.exercise_name, exercise.info || 'No details available');
  };

  const toggleBodyPart = (bodyPart: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(bodyPart)
        ? prev.filter((value) => value !== bodyPart)
        : [...prev, bodyPart]
    );
  };

  const handleCustomExerciseSaved = (exercise: ExerciseRecord) => {
    setAllItems((current) =>
      sortExercises([
        exercise,
        ...current.filter((currentExercise) => currentExercise.id !== exercise.id),
      ])
    );
    setUserId((currentUserId) => currentUserId ?? exercise.user_id);
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
    setQuery(exercise.exercise_name);
    setCustomPanelVisible(false);
  };

  const renderItem = ({ item }: { item: ExerciseRow }) => (
    <View style={styles.row}>
      <TouchableOpacity
        activeOpacity={0.92}
        style={styles.rowMain}
        onPress={() => onPick({ id: item.id, exercise_name: item.exercise_name })}
      >
        <Text style={styles.rowText}>{item.exercise_name}</Text>
        {userId ? (
          <Text style={styles.rowMeta}>
            {isCustomExercise(item, userId) ? 'Your exercise' : 'Shared exercise'}
          </Text>
        ) : null}
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.92}
        onPress={() => showInfo(item)}
        style={styles.infoBtn}
      >
        <MaterialIcons name="info-outline" size={18} color={colors.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.root, style]}>
      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonPrimary, styles.inlineButton]}
          onPress={() => setCustomPanelVisible(true)}
        >
          <MaterialIcons name="add" size={18} color={colors.blkText} />
          <Text style={styles.inlineButtonPrimaryText}>Custom</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.inlineButton]}
          onPress={() => setFilterVisible(true)}
        >
          <MaterialIcons name="filter-list" size={18} color={colors.text} />
          <Text style={globalStyles.buttonTextSecondary}>Filters</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textOffSt}
          value={query}
          onChangeText={setQuery}
        />
        {query.length > 0 ? (
          <TouchableOpacity activeOpacity={0.92} onPress={clearSearch}>
            <MaterialIcons name="close" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.listWrap}>
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={colors.highlight1} />
            <Text style={styles.loaderText}>Loading exercises…</Text>
          </View>
        ) : fetchError ? (
          <View style={styles.loader}>
            <Text style={[styles.loaderText, styles.loaderTextError]}>{fetchError}</Text>
            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonSecondary, styles.retryBtn]}
              onPress={fetchAllExercises}
            >
              <Text style={globalStyles.buttonTextSecondary}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.loaderText}>
                  {query ? 'No matches found.' : 'No exercises found.'}
                </Text>
              </View>
            }
          />
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.92}
        style={[globalStyles.buttonSecondary, styles.closeBtn]}
        onPress={onClose}
      >
        <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
      </TouchableOpacity>

      {filterVisible ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable style={styles.overlayBackdrop} onPress={() => setFilterVisible(false)} />

          <View style={[styles.overlayCard, styles.filterOverlayCard]}>
            <View style={styles.overlayHeader}>
              <View style={styles.overlayHeaderSpacer} />
              <TouchableOpacity activeOpacity={0.92} onPress={clearFilters}>
                <Text style={styles.clearText}>Clear</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSectionTitle}>Sort</Text>
            <View style={styles.chipRow}>
              <FilterChip
                label="A → Z"
                active={sortDir === 'asc'}
                onPress={() => setSortDir('asc')}
                styles={styles}
              />
              <FilterChip
                label="Z → A"
                active={sortDir === 'desc'}
                onPress={() => setSortDir('desc')}
                styles={styles}
              />
            </View>

            <Text style={styles.modalSectionTitle}>Body parts</Text>
            <View style={styles.chipWrap}>
              {allBodyParts.map((bodyPart) => (
                <FilterChip
                  key={bodyPart}
                  label={bodyPart}
                  active={selectedBodyParts.includes(bodyPart)}
                  onPress={() => toggleBodyPart(bodyPart)}
                  styles={styles}
                />
              ))}
            </View>

            <Text style={styles.modalSectionTitle}>Category</Text>
            <View style={styles.chipWrap}>
              {allCategories.map((category) => (
                <FilterChip
                  key={category}
                  label={category}
                  active={selectedCategory === category}
                  onPress={() =>
                    setSelectedCategory((prev) => (prev === category ? null : category))
                  }
                  styles={styles}
                />
              ))}
            </View>

            <TouchableOpacity
              activeOpacity={0.92}
              style={[globalStyles.buttonPrimary, styles.modalCloseBtn]}
              onPress={() => setFilterVisible(false)}
            >
              <Text style={globalStyles.buttonTextPrimary}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {customPanelVisible ? (
        <View style={styles.overlay} pointerEvents="box-none">
          <Pressable
            style={styles.overlayBackdrop}
            onPress={() => setCustomPanelVisible(false)}
          />

          <View style={styles.customOverlayCard}>
            <CustomExercisePanel
              visible={customPanelVisible}
              onClose={() => setCustomPanelVisible(false)}
              onSuccess={handleCustomExerciseSaved}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
};

function FilterChip({
  label,
  active,
  onPress,
  styles,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.92}
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{label}</Text>
    </TouchableOpacity>
  );
}

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    root: {
      position: 'relative',
      minHeight: 0,
      gap: 0,
      flex: 1,
    },
    actionRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 12,
    },
    inlineButton: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
    },
    inlineButtonPrimaryText: {
      color: colors.blkText,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.textInput,
      borderRadius: 16,
      paddingHorizontal: 12,
      minHeight: 48,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 8,
      marginBottom: 10,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 18,
    },
    listWrap: {
      flex: 1,
      minHeight: 0,
      overflow: 'hidden',
      borderRadius: 18,
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 12,
      marginBottom: 10,
    },
    rowMain: {
      flex: 1,
      paddingVertical: 14,
    },
    rowText: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    rowMeta: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 11,
      lineHeight: 15,
    },
    infoBtn: {
      width: 36,
      height: 36,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card3,
    },
    empty: {
      paddingVertical: 28,
      alignItems: 'center',
    },
    loader: {
      minHeight: 220,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 24,
    },
    loaderText: {
      marginTop: 10,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    loaderTextError: {
      color: colors.danger,
    },
    retryBtn: {
      marginTop: 14,
      minWidth: 120,
    },
    closeBtn: {
      marginTop: 12,
    },
    overlay: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: 'flex-end',
      padding: 12,
    },
    overlayBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(6, 8, 10, 0.5)',
      borderRadius: 24,
    },
    overlayCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface1,
      padding: 16,
      gap: 0,
      shadowColor: '#000',
      shadowOpacity: 0.22,
      shadowRadius: 18,
      shadowOffset: {
        width: 0,
        height: 10,
      },
      elevation: 14,
    },
    customOverlayCard: {
      marginTop: 20,
    },
    filterOverlayCard: {
      maxHeight: '78%',
    },
    overlayHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    overlayHeaderSpacer: {
      flex: 1,
    },
    clearText: {
      color: colors.danger,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    modalSectionTitle: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.textOffSt,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.7,
      textTransform: 'uppercase',
    },
    chipRow: {
      flexDirection: 'row',
      gap: 10,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
    },
    chipActive: {
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
    },
    chipText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 12,
      lineHeight: 16,
    },
    chipTextActive: {
      color: colors.highlight1,
    },
    modalCloseBtn: {
      marginTop: 22,
    },
  });
}

export default ExercisePickerLibrary;
