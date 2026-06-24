import React from 'react';

import IntervalSetupScreen from '@/components/cardio/IntervalSetupScreen';
import {
  listSavedIndoorIntervalTemplates,
  saveIndoorIntervalTemplate,
} from '@/lib/indoorIntervals/supabase';

const BACK_ROUTE = '/add/Cardio/indoor/RunTypeSelect';

export default function IndoorIntervalSetupRoute() {
  return (
    <IntervalSetupScreen
      eyebrow="Indoor interval"
      title="Choose the workout"
      subtitle="Pick a treadmill interval preset or build your own warm-up, work, break, and rest structure before the session starts."
      backRoute={BACK_ROUTE}
      sessionRoute="/add/Cardio/indoor/interval/Session"
      activityTag="indoor"
      loadSavedPlans={listSavedIndoorIntervalTemplates}
      savePlanTemplate={saveIndoorIntervalTemplate}
    />
  );
}
