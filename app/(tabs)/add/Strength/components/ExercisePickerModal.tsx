import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import AppPopup from '@/components/ui/AppPopup';
import CustomExerciseModal from './CustomExerciseModal';
import {
  fetchVisibleExercises,
  getAuthenticatedUserId,
  getExerciseBodyParts,
  isCustomExercise,
  type ExerciseRecord,
} from '@/lib/strength/exercises';

type ExerciseRow = ExerciseRecord;

type Props = {
  visible: boolean;
  onPick: (ex: { id: string; exercise_name: string }) => void;
  onClose: () => void;
  tableName?: string;
};

const ExercisePickerModal: React.FC<Props> = ({
  visible,
  onPick,
  onClose,
  tableName = 'exercises',
}) => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [allItems, setAllItems] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [showCustomModal, setShowCustomModal] = useState(false);
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
    } catch (e: any) {
      console.warn('Error fetching exercises', e);
      setFetchError(e?.message || 'Failed to fetch exercises.');
    } finally {
      setLoading(false);
    }
  }, [tableName]);

  useEffect(() => {
    if (visible) {
      resetState();
      fetchAllExercises();
    } else {
      resetState();
    }
  }, [fetchAllExercises, resetState, visible]);

  const allBodyParts = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((exercise) => {
      getExerciseBodyParts(exercise).forEach((bodyPart) => set.add(bodyPart));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    allItems.forEach((exercise) => {
      const category = exercise.workout_category || null;
      if (category) set.add(category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const clearFilters = () => {
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
  };

  const filtered = useMemo(() => {
    let list = [...allItems];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((exercise) =>
        exercise.exercise_name.toLowerCase().includes(q)
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
      const la = a.exercise_name.toLowerCase();
      const lb = b.exercise_name.toLowerCase();
      return sortDir === 'asc' ? la.localeCompare(lb) : lb.localeCompare(la);
    });

    return list;
  }, [allItems, query, selectedBodyParts, selectedCategory, sortDir]);

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
    <>
      <AppPopup
        visible={visible && !filterVisible && !showCustomModal}
        onClose={onClose}
        eyebrow="Exercise library"
        title="Select exercise"
        showCloseButton
        contentStyle={styles.container}
      >
        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.92}
            style={[globalStyles.buttonPrimary, styles.inlineButton]}
            onPress={() => setShowCustomModal(true)}
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
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={styles.loaderText}>
                  {query ? 'No matches found.' : 'No exercises found.'}
                </Text>
              </View>
            }
          />
        )}

        <TouchableOpacity
          activeOpacity={0.92}
          style={[globalStyles.buttonSecondary, styles.closeBtn]}
          onPress={onClose}
        >
          <Text style={globalStyles.buttonTextSecondary}>Cancel</Text>
        </TouchableOpacity>
      </AppPopup>

      <AppPopup
        visible={visible && filterVisible && !showCustomModal}
        onClose={() => setFilterVisible(false)}
        eyebrow="Filter library"
        title="Refine exercises"
        align="bottom"
        contentStyle={styles.modalCard}
      >
        <View style={styles.modalHeaderRow}>
          <View style={styles.modalHeaderSpacer} />
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
      </AppPopup>

      <CustomExerciseModal
        visible={visible && showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onSuccess={(exercise) => {
          setShowCustomModal(false);
          onPick({ id: exercise.id, exercise_name: exercise.exercise_name });
          onClose();
        }}
      />
    </>
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
    container: {
      maxHeight: '84%',
      gap: 0,
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
      paddingVertical: 28,
      alignItems: 'center',
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
    modalCard: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      gap: 0,
    },
    modalHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    modalHeaderSpacer: {
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
      gap: 8,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      borderRadius: 999,
      paddingHorizontal: 12,
      paddingVertical: 8,
      backgroundColor: colors.card2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.glowPrimary,
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
      textTransform: 'capitalize',
    },
    chipTextActive: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
    },
    modalCloseBtn: {
      marginTop: 22,
    },
  });
}

export default ExercisePickerModal;
