import React from 'react';
import BadgeUnlockStrip from '@/components/badges/BadgeUnlockStrip';
import type { BadgeUnlockItem } from '@/lib/badges/types';

export default function StrengthBadgeStrip({
  title,
  badges,
  compact = false,
  emptyText,
}: {
  title: string;
  badges: BadgeUnlockItem[];
  compact?: boolean;
  emptyText?: string;
}) {
  return (
    <BadgeUnlockStrip
      title={title}
      badges={badges}
      compact={compact}
      emptyText={emptyText}
    />
  );
}
