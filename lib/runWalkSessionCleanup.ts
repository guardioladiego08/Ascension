import {
  clearActiveRunWalkLock,
} from '@/lib/runWalkSessionLock';
import {
  clearActiveRunWalkSession,
} from '@/lib/activeRunWalkSessionStore';
import {
  deleteDraft,
  listDraftIds,
} from '@/lib/runWalkDraftStore';
import {
  deleteOutdoorDraft,
  listOutdoorDraftIds,
} from '@/lib/OutdoorSession/draftStore';

export async function clearAllRunWalkLocalState() {
  await clearActiveRunWalkLock().catch(() => null);
  await clearActiveRunWalkSession().catch(() => null);

  const [indoorDraftIds, outdoorDraftIds] = await Promise.all([
    listDraftIds().catch(() => [] as string[]),
    listOutdoorDraftIds().catch(() => [] as string[]),
  ]);

  await Promise.all([
    ...indoorDraftIds.map((id) => deleteDraft(id).catch(() => null)),
    ...outdoorDraftIds.map((id) => deleteOutdoorDraft(id).catch(() => null)),
  ]);
}
