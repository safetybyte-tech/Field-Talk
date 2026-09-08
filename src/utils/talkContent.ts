import type { StructuredTalkContent } from '../types';
export const sectionKeys = ['hazards', 'practices', 'ppe', 'sif', 'manual', 'q'] as const;
export function parseStructuredTalkContent(content: string): StructuredTalkContent | null {
  try {
    const value = JSON.parse(content);
    if (value && typeof value.i === 'string' && sectionKeys.every(key => Array.isArray(value[key]) && value[key].every((item: unknown) => typeof item === 'string'))) return value;
  } catch { /* Plain-text legacy records remain readable. */ }
  return null;
}
