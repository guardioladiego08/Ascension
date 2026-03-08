import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import LogoHeader from '@/components/my components/logoHeader';
import AppPopup from '@/components/ui/AppPopup';
import { useAppTheme } from '@/providers/AppThemeProvider';
import {
  fetchVisibleExercises,
  getAuthenticatedUserId,
  getExerciseBodyParts,
  type ExerciseRecord,
} from '@/lib/strength/exercises';

type ExerciseRow = ExerciseRecord;

const ExercisesScreen: React.FC = () => {
  const { colors, fonts, globalStyles } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);

  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selectedBodyParts, setSelectedBodyParts] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [filterVisible, setFilterVisible] = useState(false);

  const loadExercises = useCallback(async () => {
    try {
      setLoadingInitial(true);
      setErrorMsg(null);

      const userId = await getAuthenticatedUserId();
      if (!userId) {
        setExercises([]);
        setErrorMsg('Not signed in.');
        return;
      }

      setExercises(await fetchVisibleExercises(userId));
    } catch (err) {
      console.warn('Error loading exercises', err);
      setExercises([]);
      setErrorMsg('Unexpected error while loading exercises.');
    } finally {
      setLoadingInitial(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  const allBodyParts = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((exercise) => {
      getExerciseBodyParts(exercise).forEach((bodyPart) => {
        if (bodyPart) set.add(bodyPart);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const allCategories = useMemo(() => {
    const set = new Set<string>();
    exercises.forEach((exercise) => {
      const category = exercise.workout_category || null;
      if (category) set.add(category);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [exercises]);

  const toggleBodyPart = (bodyPart: string) => {
    setSelectedBodyParts((prev) =>
      prev.includes(bodyPart)
        ? prev.filter((value) => value !== bodyPart)
        : [...prev, bodyPart]
    );
  };

  const clearFilters = () => {
    setSelectedBodyParts([]);
    setSelectedCategory(null);
    setSortDir('asc');
  };

  const filteredExercises = useMemo(() => {
    let list = [...exercises];

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter((exercise) =>
        exercise.exercise_name.toLowerCase().includes(query)
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
      const comparison = left.localeCompare(right);
      return sortDir === 'asc' ? comparison : -comparison;
    });

    return list;
  }, [exercises, search, selectedBodyParts, selectedCategory, sortDir]);

  const activeFilterCount =
    selectedBodyParts.length + (selectedCategory ? 1 : 0) + (sortDir === 'desc' ? 1 : 0);

  const renderItem = ({ item }: { item: ExerciseRow }) => {
    const bodyParts = getExerciseBodyParts(item);

    return (
      <TouchableOpacity
        style={styles.itemCard}
        activeOpacity={0.88}
        onPress={() =>
          router.push({
            pathname: '/progress/strength/[id]',
            params: {
              id: item.id,
              name: item.exercise_name,
            },
          })
        }
      >
        <View style={styles.itemTopRow}>
          <View style={styles.itemCopy}>
            <Text style={styles.itemTitle}>{item.exercise_name}</Text>
            <Text style={styles.itemSubtitle}>
              {item.workout_category || 'Strength exercise'}
            </Text>
          </View>
          <View style={styles.chevronWrap}>
            <Ionicons name="chevron-forward" size={18} color={colors.textOffSt} />
          </View>
        </View>

        <View style={styles.tagRow}>
          {bodyParts.slice(0, 3).map((bodyPart) => (
            <View key={bodyPart} style={styles.tag}>
              <Text style={styles.tagText}>{bodyPart}</Text>
            </View>
          ))}
          {bodyParts.length === 0 ? (
            <View style={styles.tag}>
              <Text style={styles.tagText}>General</Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => {
    if (loadingInitial) {
      return (
        <View style={[globalStyles.panelSoft, styles.stateCard]}>
          <ActivityIndicator size="small" color={colors.highlight1} />
          <Text style={styles.stateText}>Loading exercises...</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
        <View style={[globalStyles.panelSoft, styles.stateCard]}>
          <Text style={styles.errorText}>{errorMsg}</Text>
        </View>
      );
    }

    return (
      <View style={[globalStyles.panelSoft, styles.stateCard]}>
        <Text style={styles.stateText}>No exercises found.</Text>
      </View>
    );
  };

  return (
    <LinearGradient
      colors={[colors.gradientTop, colors.gradientMid, colors.gradientBottom]}
      start={{ x: 0.2, y: 0 }}
      end={{ x: 0.8, y: 1 }}
      style={globalStyles.page}
    >
      <View style={globalStyles.safeArea}>
        <LogoHeader showBackButton />

        <View style={styles.screen}>
          <View style={styles.hero}>
            <Text style={globalStyles.eyebrow}>Strength Library</Text>
            <Text style={globalStyles.header}>Exercises</Text>
            <Text style={styles.heroText}>
              Browse every exercise you have logged, filter the list, and open any
              movement for a dedicated stats view.
            </Text>
          </View>

          <View style={styles.controlsCard}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search-outline" size={16} color={colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search exercises"
                placeholderTextColor={colors.textOffSt}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 ? (
                <TouchableOpacity activeOpacity={0.8} onPress={() => setSearch('')}>
                  <Ionicons name="close-circle" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={[globalStyles.buttonSecondary, styles.filterButton]}
              onPress={() => setFilterVisible(true)}
              activeOpacity={0.88}
            >
              <Ionicons name="options-outline" size={16} color={colors.text} />
              <Text style={globalStyles.buttonTextSecondary}>Filters</Text>
              {activeFilterCount > 0 ? (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          </View>

          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />

          <AppPopup
            visible={filterVisible}
            onClose={() => setFilterVisible(false)}
            align="bottom"
            animationType="slide"
            eyebrow="Exercise Filters"
            title="Refine exercise list"
            subtitle="Sort the library and narrow it by body part or workout category."
            showCloseButton
            bodyStyle={styles.popupBody}
            footer={
              <View style={styles.popupFooter}>
                <TouchableOpacity
                  style={[globalStyles.buttonSecondary, styles.popupFooterButton]}
                  onPress={clearFilters}
                >
                  <Text style={globalStyles.buttonTextSecondary}>Clear</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[globalStyles.buttonPrimary, styles.popupFooterButton]}
                  onPress={() => setFilterVisible(false)}
                >
                  <Text style={globalStyles.buttonTextPrimary}>Done</Text>
                </TouchableOpacity>
              </View>
            }
          >
            <Text style={styles.popupSectionLabel}>Sort</Text>
            <View style={styles.chipRow}>
              <FilterChip
                label="A to Z"
                active={sortDir === 'asc'}
                onPress={() => setSortDir('asc')}
                styles={styles}
              />
              <FilterChip
                label="Z to A"
                active={sortDir === 'desc'}
                onPress={() => setSortDir('desc')}
                styles={styles}
              />
            </View>

            {allBodyParts.length > 0 ? (
              <>
                <Text style={styles.popupSectionLabel}>Body Parts</Text>
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
              </>
            ) : null}

            {allCategories.length > 0 ? (
              <>
                <Text style={styles.popupSectionLabel}>Workout Category</Text>
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
              </>
            ) : null}
          </AppPopup>
        </View>
      </View>
    </LinearGradient>
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
      style={[styles.chip, active ? styles.chipActive : null]}
      onPress={onPress}
      activeOpacity={0.88}
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
    screen: {
      flex: 1,
      paddingTop: 8,
      gap: 14,
    },
    hero: {
      borderRadius: 28,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 20,
      gap: 8,
    },
    heroText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 14,
      lineHeight: 20,
    },
    controlsCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 12,
      gap: 10,
    },
    searchWrapper: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 12,
      minHeight: 48,
    },
    searchInput: {
      flex: 1,
      marginLeft: 8,
      color: colors.text,
      fontFamily: fonts.body,
      fontSize: 14,
    },
    filterButton: {
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      gap: 8,
      position: 'relative',
    },
    filterBadge: {
      minWidth: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: colors.highlight1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
    },
    filterBadgeText: {
      color: colors.blkText,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
    },
    listContent: {
      paddingBottom: 28,
      gap: 10,
    },
    itemCard: {
      borderRadius: 24,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      padding: 15,
      gap: 12,
    },
    itemTopRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    itemCopy: {
      flex: 1,
    },
    itemTitle: {
      color: colors.text,
      fontFamily: fonts.heading,
      fontSize: 16,
      lineHeight: 21,
    },
    itemSubtitle: {
      marginTop: 4,
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 17,
    },
    chevronWrap: {
      width: 28,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tagRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    tag: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card3,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    tagText: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 10,
      lineHeight: 12,
      letterSpacing: 0.35,
      textTransform: 'uppercase',
    },
    stateCard: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 28,
      gap: 8,
    },
    stateText: {
      color: colors.textMuted,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    errorText: {
      color: colors.danger,
      fontFamily: fonts.body,
      fontSize: 13,
      lineHeight: 18,
      textAlign: 'center',
    },
    popupBody: {
      gap: 14,
    },
    popupSectionLabel: {
      color: colors.textMuted,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
      letterSpacing: 0.4,
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
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card2,
      paddingHorizontal: 11,
      paddingVertical: 7,
    },
    chipActive: {
      backgroundColor: colors.accentSoft,
      borderColor: colors.highlight1,
    },
    chipText: {
      color: colors.text,
      fontFamily: fonts.label,
      fontSize: 11,
      lineHeight: 14,
    },
    chipTextActive: {
      color: colors.highlight1,
    },
    popupFooter: {
      flexDirection: 'row',
      gap: 10,
    },
    popupFooterButton: {
      flex: 1,
    },
  });
}

export default ExercisesScreen;
