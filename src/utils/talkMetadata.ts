import type { ToolboxTalk } from '../types';
import { parseHarnessReview } from './harness';

type Metadata = Pick<ToolboxTalk, 'notes' | 'draftStep' | 'drafted' | 'approved' | 'approvedBy' | 'approvedAt' | 'approvedByUserId' | 'approvedRecord' | 'harness'>;

// Keep workflow metadata with the existing content column, including on older databases.
export function encodeTalkContent(talk: ToolboxTalk): string {
  const { notes, draftStep, drafted, approved, approvedBy, approvedAt, approvedByUserId, approvedRecord, harness } = talk;
  return JSON.stringify({ fieldTalkRecordVersion: 1, content: talk.content,
    metadata: { notes, draftStep, drafted, approved, approvedBy, approvedAt, approvedByUserId, approvedRecord, harness } });
}

export function decodeTalkContent(content: string): { content: string; metadata: Metadata } {
  try {
    const value = JSON.parse(content);
    if (value?.fieldTalkRecordVersion === 1 && typeof value.content === 'string') {
      const m = value.metadata || {};
      return { content: value.content, metadata: {
        notes: typeof m.notes === 'string' ? m.notes : undefined,
        draftStep: [1, 2, 3].includes(m.draftStep) ? m.draftStep : undefined,
        drafted: m.drafted === true,
        approved: m.approved === true,
        approvedBy: typeof m.approvedBy === 'string' ? m.approvedBy : undefined,
        approvedAt: typeof m.approvedAt === 'number' ? m.approvedAt : undefined,
        approvedByUserId: typeof m.approvedByUserId === 'string' ? m.approvedByUserId : undefined,
        approvedRecord: typeof m.approvedRecord === 'string' ? m.approvedRecord : undefined,
        harness: parseHarnessReview(m.harness),
      } };
    }
  } catch { /* Legacy plain-text talks remain readable. */ }
  return { content, metadata: {} };
}
