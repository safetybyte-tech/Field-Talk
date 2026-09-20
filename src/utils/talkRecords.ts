import type { ToolboxTalk } from '../types';

/** Match storage.getTalks: newest creation first, stable ID order for ties. */
export function mergeSavedTalk(talks: ToolboxTalk[], saved: ToolboxTalk, previousId = saved.id): ToolboxTalk[] {
  return [saved, ...talks.filter(talk => talk.id !== previousId && talk.id !== saved.id)]
    .sort((left, right) => right.createdAt - left.createdAt || left.id.localeCompare(right.id));
}
