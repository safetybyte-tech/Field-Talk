export interface HarnessReview {
  version: 'harness-v2';
  retrieval: { status: 'grounded' | 'no_match' | 'unavailable'; sourceCount: number; citations: string[] };
  validation: { id: string; status: 'pass' | 'warning' | 'review_required'; message: string }[];
  persisted: boolean;
}

export function parseHarnessReview(value: unknown): HarnessReview | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const v = value as HarnessReview;
  if (v.version !== 'harness-v2' || !v.retrieval ||
      !['grounded', 'no_match', 'unavailable'].includes(v.retrieval.status) ||
      !Number.isInteger(v.retrieval.sourceCount) || v.retrieval.sourceCount < 0 ||
      !Array.isArray(v.retrieval.citations) || !v.retrieval.citations.every(c => typeof c === 'string') ||
      !Array.isArray(v.validation) || !v.validation.every(c => c && typeof c.id === 'string' &&
        ['pass', 'warning', 'review_required'].includes(c.status) && typeof c.message === 'string') ||
      typeof v.persisted !== 'boolean') return undefined;
  return { version: v.version, retrieval: v.retrieval, validation: v.validation, persisted: v.persisted };
}

export function harnessMessages(review: HarnessReview): string[] {
  const messages = review.validation.filter(c => c.status !== 'pass').map(c => c.message);
  if (review.retrieval.status !== 'grounded') messages.unshift('No matching OSHA evidence was available for this draft. Verify requirements before using it.');
  if (!review.persisted) messages.push('The generation audit could not be saved. Review this draft carefully before signing.');
  return [...new Set(messages)];
}
