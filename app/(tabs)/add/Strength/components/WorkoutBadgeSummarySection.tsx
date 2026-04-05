import React from 'react';
import BadgeSummarySection from '@/components/badges/BadgeSummarySection';
import type { BadgeUnlockItem } from '@/lib/badges/types';

export default function WorkoutBadgeSummarySection({
  badges,
  loading,
  errorText,
}: {
  badges: BadgeUnlockItem[];
  loading: boolean;
  errorText: string | null;
}) {
  return (
    <BadgeSummarySection
      title="Strength unlocks"
      subtitle="Newly earned badges from this completed workout appear here."
      emptyText="No new strength badges unlocked in this workout."
      loadingText="Checking badges..."
      badges={badges}
      loading={loading}
      errorText={errorText}
    />
  );
}
