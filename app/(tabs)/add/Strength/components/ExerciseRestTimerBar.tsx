import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet } from 'react-native';

import {
  formatRestTimerClock,
  getStrengthRestTimerProgress,
  type StrengthRestTimerState,
} from '@/lib/strength/restTimer';
import { useAppTheme } from '@/providers/AppThemeProvider';

import StrengthRestTimerBar from './StrengthRestTimerBar';

type Props = {
  timer: StrengthRestTimerState;
  exerciseInstanceId: string;
};

const ExerciseRestTimerBar: React.FC<Props> = ({ timer, exerciseInstanceId }) => {
  const { colors, fonts } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, fonts), [colors, fonts]);
  const [nowMs, setNowMs] = useState(Date.now());

  const isVisible =
    timer.ownerKind === 'exercise' &&
    timer.ownerId === exerciseInstanceId &&
    (timer.status === 'running' || timer.status === 'ready');

  useEffect(() => {
    if (!isVisible || timer.status !== 'running') return;

    setNowMs(Date.now());
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, 250);

    return () => clearInterval(id);
  }, [isVisible, timer.endAtMs, timer.status]);

  if (!isVisible) {
    return null;
  }

  const progress = getStrengthRestTimerProgress(timer, nowMs);
  const statusLabel =
    timer.status === 'ready' ? 'Ready for next set' : 'Rest timer';

  return (
    <StrengthRestTimerBar
      statusLabel={statusLabel}
      timeLabel={formatRestTimerClock(timer.remainingSeconds)}
      progress={progress}
      ready={timer.status === 'ready'}
      style={styles.wrap}
    />
  );
};

export default ExerciseRestTimerBar;

function createStyles(
  _colors: ReturnType<typeof useAppTheme>['colors'],
  _fonts: ReturnType<typeof useAppTheme>['fonts']
) {
  return StyleSheet.create({
    wrap: {
      marginTop: 12,
    },
  });
}
