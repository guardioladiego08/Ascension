import React from 'react';
import { useLocalSearchParams } from 'expo-router';

import { OutdoorLiveSessionScreen } from '../OutdoorSession';
import { deserializeIntervalPlan } from '@/lib/intervals/plans';

export default function IntervalSessionRoute() {
  const params = useLocalSearchParams<{
    title?: string;
    planPayload?: string;
  }>();

  const plan = deserializeIntervalPlan(params.planPayload?.toString());

  return (
    <OutdoorLiveSessionScreen
      title={(params.title ?? plan?.name ?? 'Interval Run').toString()}
      activityType="run"
      runSubtype="interval"
      sessionVariant="interval"
      intervalPlan={plan}
    />
  );
}
