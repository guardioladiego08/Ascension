import { supabase } from '@/lib/supabase';

import type { BadgeDomain, BadgeProgressItem, BadgeUnlockItem } from './types';

function asNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function asNullableNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asNullableString(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text.length > 0 ? text : null;
}

function isMissingBadgeRpc(error: any) {
  if (!error) return false;
  const code = String(error?.code ?? '');
  const message = String(error?.message ?? '').toLowerCase();
  return (
    code === 'PGRST202' ||
    code === 'PGRST204' ||
    code === '42P01' ||
    code === '3F000' ||
    message.includes('could not find the function') ||
    message.includes('schema cache') ||
    message.includes('does not exist')
  );
}

function normalizeDomain(value: unknown): BadgeDomain {
  const domain = String(value ?? '').toLowerCase();
  if (domain === 'running') return 'running';
  if (domain === 'nutrition') return 'nutrition';
  return 'strength';
}

function mapBadgeProgressRow(row: any): BadgeProgressItem {
  return {
    badgeSeriesId: String(row.badge_series_id),
    domain: normalizeDomain(row.domain),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    description: asNullableString(row.description),
    badgeKind: String(row.badge_kind ?? ''),
    metricKey: String(row.metric_key ?? ''),
    progressMode: String(row.progress_mode ?? ''),
    seriesIconPlaceholder: String(row.series_icon_placeholder ?? 'badge-placeholder'),
    displayOrder: Math.trunc(asNumber(row.display_order)),
    currentValue: asNumber(row.current_value),
    bestValue: asNumber(row.best_value),
    progressValue: asNumber(row.progress_value),
    highestTierId: asNullableString(row.highest_tier_id),
    highestTierCode: asNullableString(row.highest_tier_code),
    highestTierName: asNullableString(row.highest_tier_name),
    highestThresholdValue: asNullableNumber(row.highest_threshold_value),
    highestIconPlaceholder: asNullableString(row.highest_icon_placeholder),
    nextTierId: asNullableString(row.next_tier_id),
    nextTierCode: asNullableString(row.next_tier_code),
    nextTierName: asNullableString(row.next_tier_name),
    nextThresholdValue: asNullableNumber(row.next_threshold_value),
    nextIconPlaceholder: asNullableString(row.next_icon_placeholder),
    remainingToNext: asNullableNumber(row.remaining_to_next),
    lastSourceType: asNullableString(row.last_source_type),
    lastSourceId: asNullableString(row.last_source_id),
    lastEvaluatedAt: asNullableString(row.last_evaluated_at),
  };
}

function mapBadgeUnlockRow(row: any): BadgeUnlockItem {
  return {
    unlockId: String(row.unlock_id),
    userId: String(row.user_id),
    badgeSeriesId: String(row.badge_series_id),
    badgeTierId: String(row.badge_tier_id),
    domain: normalizeDomain(row.domain),
    code: String(row.code ?? ''),
    name: String(row.name ?? ''),
    description: asNullableString(row.description),
    badgeKind: String(row.badge_kind ?? ''),
    metricKey: String(row.metric_key ?? ''),
    progressMode: String(row.progress_mode ?? ''),
    seriesIconPlaceholder: String(row.series_icon_placeholder ?? 'badge-placeholder'),
    tierCode: String(row.tier_code ?? ''),
    tierName: String(row.tier_name ?? ''),
    thresholdValue: asNumber(row.threshold_value),
    tierIconPlaceholder: String(row.tier_icon_placeholder ?? 'badge-placeholder'),
    unlockCopy: asNullableString(row.unlock_copy),
    sourceType: asNullableString(row.source_type),
    sourceId: asNullableString(row.source_id),
    createdAt: String(row.created_at),
  };
}

export async function getBadgeProgress(args: {
  domain: BadgeDomain;
  userId?: string | null;
  limit?: number;
}): Promise<BadgeProgressItem[]> {
  const response = await supabase.rpc('get_badge_progress_user', {
    p_user_id: args.userId ?? null,
    p_domain: args.domain,
    p_limit: args.limit ?? 100,
  });

  if (isMissingBadgeRpc(response.error)) {
    return [];
  }

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as any[]).map(mapBadgeProgressRow);
}

export async function getRecentBadgeUnlocks(args: {
  domain: BadgeDomain;
  userId?: string | null;
  limit?: number;
}): Promise<BadgeUnlockItem[]> {
  const response = await supabase.rpc('get_recent_badge_unlocks_user', {
    p_user_id: args.userId ?? null,
    p_domain: args.domain,
    p_limit: args.limit ?? 12,
  });

  if (isMissingBadgeRpc(response.error)) {
    return [];
  }

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as any[]).map(mapBadgeUnlockRow);
}

export async function getBadgeUnlocksForSource(args: {
  ownerId: string;
  sourceType: string;
  sourceId: string;
  domain: BadgeDomain;
  limit?: number;
}): Promise<BadgeUnlockItem[]> {
  const response = await supabase.rpc('get_badge_unlocks_for_source_user', {
    p_owner_id: args.ownerId,
    p_source_type: args.sourceType,
    p_source_id: args.sourceId,
    p_domain: args.domain,
    p_limit: args.limit ?? 6,
  });

  if (isMissingBadgeRpc(response.error)) {
    return [];
  }

  if (response.error) {
    throw response.error;
  }

  return ((response.data ?? []) as any[]).map(mapBadgeUnlockRow);
}
