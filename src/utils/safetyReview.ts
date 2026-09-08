import type { StructuredTalkContent } from '../types';

export type RetrievalStatus = 'grounded' | 'no_match' | 'unavailable';
export interface ValidationCheck {
  id: string;
  status: 'pass' | 'warning' | 'review_required';
  message: string;
}

export function getRiskSignals(text: string): string[] {
  const rules: [string, RegExp][] = [
    ['fall', /\b(fall\w*|roof\w*|ladder\w*|scaffold\w*|elevated|heights?|aerial lifts?)\b/i],
    ['excavation', /\b(excavat\w*|trench\w*|shor(?:e|es|ed|ing)|soil)\b/i],
    ['electrical', /\b(electric\w*|energi[sz]ed|panels?|arc[- ]flash|power[- ]?lines?|conduits?)\b/i],
    ['lifting', /\b(cranes?|rigg\w*|hoist\w*|lift\w*|suspend\w*|loads?)\b/i],
    ['confined_space', /\b(confined[- ]spaces?|permit[- ]spaces?|manholes?|tanks?|vaults?)\b/i],
    ['line_of_fire', /\b(line of fire|struck[- ]by|caught[- ]?between|pinch points?)\b/i],
  ];
  return rules.filter(([, pattern]) => pattern.test(text)).map(([signal]) => signal);
}

// These are conservative screening checks, not a semantic or regulatory approval.
// Match an action AND a control in the same item; a hazard noun is not a control.
const prevention: Record<string, RegExp> = {
  fall: /\b(?:use|install|inspect|secure|verify|maintain|provide|connect|wear|ensure)\b.*\b(?:fall[- ](?:protection|arrest)|harness\w*|guardrails?|anchors?|restraint|edge protection)\b/i,
  excavation: /\b(?:install|use|verify|provide|inspect|maintain|ensure)\b.*\b(?:protective systems?|protection|shor\w*|slop\w*|shield\w*|trench box\w*)\b|\b(?:do not|never) enter\b.*\b(?:unprotected|protection|competent)\b|\bcompetent person\b.*\binspect\w*\b/i,
  electrical: /\b(?:de[- ]?energi[sz]e|lock ?out|test\b.*\b(?:voltage|dead|absence))|\b(?:maintain|verify|confirm|establish|ensure)\b.*\b(?:clearance|distance)\b.*\bpower[- ]?lines?\b|\b(?:stop|do not|never)\b.*\b(?:lift|work|crane|operat\w*)\b.*\b(?:clearance|voltage|power[- ]?line)\b/i,
  lifting: /\b(?:inspect|verify|use|secure|check)\b.*\b(?:rigging|slings?|load|hoist|crane)\b|\b(?:keep|stay|exclude|barricade|establish)\b.*\b(?:clear|outside|away|out|barricades?)\b.*\b(?:load|landing|lift|zone)\b|\b(?:never|do not)\b.*\b(?:stand|walk|work)\b.*\b(?:under|beneath)\b.*\bload\b/i,
  confined_space: /\b(?:test|monitor|verify|provide|assign|establish|obtain)\b.*\b(?:atmospher\w*|oxygen|attendant|rescue|permit)\b|\b(?:never|do not) enter\b.*\b(?:permit|test|rescue)\b/i,
  line_of_fire: /\b(?:keep|stay|position|establish|install|exclude)\b.*\b(?:clear|away|outside|barricades?|exclusion|line of fire|pinch)\b/i,
};

export function validateHarnessV2Talk(
  talk: StructuredTalkContent, riskSignals: string[], retrievalStatus: RetrievalStatus, task = '',
): ValidationCheck[] {
  const items = [...talk.hazards, ...talk.practices, ...talk.ppe, ...talk.sif, ...talk.manual, ...talk.q];
  const longItems = items.filter(item => item.replace(/\(?1926\.\d+(?:\([a-z0-9]+\))*\)?/gi, '').trim().split(/\s+/).length > 12);
  const missing = riskSignals.filter(signal => !talk.sif.some(item => prevention[signal]?.test(item)));
  const checks: ValidationCheck[] = [
    { id: 'item_length', status: longItems.length ? 'warning' : 'pass', message: longItems.length ? `${longItems.length} action item(s) exceed the 12-word target. Keep necessary safety detail.` : 'Action items meet the length target.' },
    { id: 'sif_coverage', status: missing.length || !talk.sif.some(item => item.trim()) ? 'review_required' : 'pass', message: !talk.sif.some(item => item.trim()) ? 'Add serious injury/fatality prevention actions before signing.' : missing.length ? `Verify specific SIF controls for: ${missing.map(s => s.replace(/_/g, ' ')).join(', ')}. Automated screening could not identify them.` : 'The screening checklist found prevention actions for the detected risks; completeness still requires human review.' },
    { id: 'retrieval_health', status: retrievalStatus === 'grounded' ? 'pass' : 'review_required', message: retrievalStatus === 'grounded' ? 'OSHA sources were retrieved; applicability must be verified.' : 'Matching OSHA evidence was unavailable. Verify applicable requirements before use.' },
  ];
  const controls = [...talk.practices, ...talk.sif, ...talk.manual].join(' ');
  const requireControl = (id: string, present: boolean, message: string) => {
    if (!present) checks.push({ id, status: 'review_required', message });
  };
  if (riskSignals.includes('excavation')) {
    requireControl('excavation_protection', prevention.excavation.test(controls), 'Verify an adequate cave-in protective system before entry (1926.652); assess applicable exceptions with the competent person.');
    requireControl('excavation_egress', /\b(?:25|twenty[- ]five)\s*(?:feet|foot|ft)\b/i.test(controls) && /\b(?:ladder|egress|exit|access)\b/i.test(controls), 'For trenches at least 4 feet deep, specify safe egress within 25 feet of lateral travel (1926.651(c)(2)).');
    requireControl('excavation_spoil', /\b(?:2|two)\s*(?:feet|foot|ft)\b/i.test(controls) && /\b(?:spoil|material|equipment)\b/i.test(controls) || /\bretaining (?:device|system)s?\b/i.test(controls), 'Specify spoil/material separation of at least 2 feet or suitable retaining devices (1926.651(j)(2)).');
    requireControl('excavation_inspection', /competent person/i.test(controls) && /inspect\w*/i.test(controls) && /(?:rain|hazard[- ]increas|changing conditions)/i.test(controls), 'Specify competent-person inspections before work and after rainstorms or other hazard-increasing events (1926.651(k)).');
    if (/\b(rain\w*|water|wet|flood\w*)\b/i.test(task)) requireControl('excavation_water', /\b(?:do not|never|stop|remove|control|pump|protect|monitor)\b.*\b(?:water|flood\w*)\b/i.test(controls), 'Address accumulated water and keep workers out until adequate precautions are in place (1926.651(h)).');
  }
  return checks;
}
