import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useAppTheme } from '@/providers/AppThemeProvider';
import { HOME_TONES } from '../../../home/tokens';

type ExerciseSelection = {
  id: string;
  exercise_name: string;
};

type Props = {
  items: ExerciseSelection[];
  onChange: (items: ExerciseSelection[]) => void;
  onRemove: (exerciseId: string) => void;
};

type DragState = {
  id: string;
  originIndex: number;
  targetIndex: number;
};

const ROW_HEIGHT = 88;
const CARD_HEIGHT = 64;

function arrayMove<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = [...items];
  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

const SupersetExerciseSelectionList: React.FC<Props> = ({
  items,
  onChange,
  onRemove,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const dragOffset = useRef(new Animated.Value(0)).current;
  const [dragState, setDragState] = useState<DragState | null>(null);

  useEffect(() => {
    if (!dragState) {
      dragOffset.setValue(0);
      return;
    }

    const nextIndex = items.findIndex((item) => item.id === dragState.id);
    if (nextIndex === -1) {
      dragOffset.setValue(0);
      setDragState(null);
      return;
    }

    if (nextIndex !== dragState.originIndex) {
      setDragState({
        ...dragState,
        originIndex: nextIndex,
        targetIndex: nextIndex,
      });
      dragOffset.setValue(0);
    }
  }, [dragOffset, dragState, items]);

  const startDrag = (id: string, index: number) => {
    dragOffset.setValue(0);
    setDragState({
      id,
      originIndex: index,
      targetIndex: index,
    });
  };

  const updateDrag = (dy: number) => {
    dragOffset.setValue(dy);
    setDragState((current) => {
      if (!current) {
        return current;
      }

      const nextIndex = clamp(
        current.originIndex + Math.round(dy / ROW_HEIGHT),
        0,
        items.length - 1
      );

      if (nextIndex === current.targetIndex) {
        return current;
      }

      return {
        ...current,
        targetIndex: nextIndex,
      };
    });
  };

  const endDrag = () => {
    if (!dragState) {
      return;
    }

    if (dragState.originIndex !== dragState.targetIndex) {
      onChange(arrayMove(items, dragState.originIndex, dragState.targetIndex));
    }

    dragOffset.setValue(0);
    setDragState(null);
  };

  const getShiftForIndex = (index: number) => {
    if (!dragState || index === dragState.originIndex) {
      return 0;
    }

    if (index > dragState.originIndex && index <= dragState.targetIndex) {
      return -ROW_HEIGHT;
    }

    if (index < dragState.originIndex && index >= dragState.targetIndex) {
      return ROW_HEIGHT;
    }

    return 0;
  };

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isDragging = dragState?.id === item.id;
        const translateY = isDragging ? dragOffset : getShiftForIndex(index);

        return (
          <View key={item.id} style={styles.rowSlot}>
            {isDragging ? <View style={styles.placeholderCard} /> : null}

            <Animated.View
              style={[
                styles.cardShell,
                {
                  transform: [{ translateY }],
                },
                isDragging ? styles.cardShellActive : null,
              ]}
            >
              <SelectionRow
                item={item}
                orderIndex={index}
                dragging={isDragging}
                dragDisabled={Boolean(dragState && !isDragging)}
                onRemove={() => onRemove(item.id)}
                onDragStart={() => startDrag(item.id, index)}
                onDragMove={updateDrag}
                onDragEnd={endDrag}
              />
            </Animated.View>
          </View>
        );
      })}
    </View>
  );
};

type SelectionRowProps = {
  item: ExerciseSelection;
  orderIndex: number;
  dragging: boolean;
  dragDisabled: boolean;
  onRemove: () => void;
  onDragStart: () => void;
  onDragMove: (dy: number) => void;
  onDragEnd: () => void;
};

const SelectionRow: React.FC<SelectionRowProps> = ({
  item,
  orderIndex,
  dragging,
  dragDisabled,
  onRemove,
  onDragStart,
  onDragMove,
  onDragEnd,
}) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const dragDisabledRef = useRef(dragDisabled);
  const onDragStartRef = useRef(onDragStart);
  const onDragMoveRef = useRef(onDragMove);
  const onDragEndRef = useRef(onDragEnd);

  useEffect(() => {
    dragDisabledRef.current = dragDisabled;
  }, [dragDisabled]);

  useEffect(() => {
    onDragStartRef.current = onDragStart;
    onDragMoveRef.current = onDragMove;
    onDragEndRef.current = onDragEnd;
  }, [onDragEnd, onDragMove, onDragStart]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !dragDisabledRef.current,
      onMoveShouldSetPanResponder: () => !dragDisabledRef.current,
      onPanResponderGrant: () => {
        if (dragDisabledRef.current) {
          return;
        }

        onDragStartRef.current();
      },
      onPanResponderMove: (_event, gestureState) => {
        if (dragDisabledRef.current) {
          return;
        }

        onDragMoveRef.current(gestureState.dy);
      },
      onPanResponderRelease: () => {
        onDragEndRef.current();
      },
      onPanResponderTerminate: () => {
        onDragEndRef.current();
      },
    })
  ).current;

  return (
    <View style={[styles.exerciseRow, dragging ? styles.exerciseRowDragging : null]}>
      <View style={styles.exerciseOrderBadge}>
        <Text style={styles.exerciseOrderText}>{orderIndex + 1}</Text>
      </View>

      <View style={styles.exerciseCopy}>
        <Text style={styles.exerciseName}>{item.exercise_name}</Text>
        <Text style={styles.exerciseMeta}>
          {dragging ? 'Drop to set the sequence' : 'Hold and drag to reorder'}
        </Text>
      </View>

      <View style={styles.exerciseActions}>
        <TouchableOpacity
          activeOpacity={0.92}
          style={styles.iconBtn}
          onPress={onRemove}
          disabled={dragging}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={16} color={colors.danger} />
        </TouchableOpacity>

        <View
          collapsable={false}
          style={[styles.iconBtn, styles.dragHandle, dragDisabled ? styles.iconBtnMuted : null]}
          {...panResponder.panHandlers}
        >
          <Ionicons name="reorder-three-outline" size={18} color={colors.text} />
        </View>
      </View>
    </View>
  );
};

function createStyles(
  colors: ReturnType<typeof useAppTheme>['colors'],
  fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    container: {
      width: '100%',
      overflow: 'visible',
    },
    rowSlot: {
      height: ROW_HEIGHT,
      justifyContent: 'center',
      overflow: 'visible',
    },
    placeholderCard: {
      height: CARD_HEIGHT,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
      backgroundColor: colors.accentSoft,
      opacity: 0.32,
    },
    cardShell: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: (ROW_HEIGHT - CARD_HEIGHT) / 2,
      overflow: 'visible',
    },
    cardShellActive: {
      zIndex: 10,
      elevation: 12,
    },
    exerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
      backgroundColor: HOME_TONES.surface2,
      minHeight: CARD_HEIGHT,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    exerciseRowDragging: {
      borderColor: colors.glowPrimary,
      backgroundColor: HOME_TONES.surface1,
      shadowColor: '#000',
      shadowOpacity: 0.24,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      elevation: 12,
    },
    exerciseOrderBadge: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.accentSoft,
      borderWidth: 1,
      borderColor: colors.glowPrimary,
    },
    exerciseOrderText: {
      color: colors.highlight1,
      fontFamily: fonts.heading,
      fontSize: 14,
      lineHeight: 18,
    },
    exerciseCopy: {
      flex: 1,
      gap: 2,
    },
    exerciseName: {
      color: HOME_TONES.textPrimary,
      fontFamily: fonts.heading,
      fontSize: 15,
      lineHeight: 19,
    },
    exerciseMeta: {
      color: HOME_TONES.textTertiary,
      fontFamily: fonts.body,
      fontSize: 12,
      lineHeight: 16,
    },
    exerciseActions: {
      flexDirection: 'row',
      gap: 8,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: HOME_TONES.surface1,
      borderWidth: 1,
      borderColor: HOME_TONES.borderSoft,
    },
    iconBtnMuted: {
      opacity: 0.55,
    },
    dragHandle: {
      borderStyle: 'dashed',
    },
  });
}

export default SupersetExerciseSelectionList;
