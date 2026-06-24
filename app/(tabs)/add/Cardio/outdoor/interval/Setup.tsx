import React from 'react';

import IntervalSetupScreen from '@/components/cardio/IntervalSetupScreen';
import {
  listSavedIntervalTemplates,
  saveCustomIntervalTemplate,
} from '@/lib/intervals/supabase';

const BACK_ROUTE = '/add/Cardio/outdoor/RunTypeSelect';

export default function OutdoorIntervalSetupRoute() {
  return (
    <IntervalSetupScreen
      eyebrow="Interval run"
      title="Choose the workout"
      subtitle="Presets are adapted from reputable running plans, and every phase can trigger in-app plus lock-screen cues."
      backRoute={BACK_ROUTE}
      sessionRoute="/add/Cardio/outdoor/interval/Session"
      activityTag="outdoor"
      loadSavedPlans={listSavedIntervalTemplates}
      savePlanTemplate={saveCustomIntervalTemplate}
    />
  );
}
