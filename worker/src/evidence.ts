import { getRiskSignals } from '../../src/utils/safetyReview';

export interface OshaStandardMatch {
  citation: string;
  subpart: string | null;
  subpart_title: string | null;
  source_url: string;
  text: string;
  similarity?: number;
}

// Remove explicitly excluded task phrases before applying specialized scope gates.
export function positiveTask(query: string): string {
  return query.replace(/\b(?:not|no|without|excluding)\s+(?:any\s+)?(?:structural\s+)?steel erection\b/gi, '')
    .replace(/\b(?:not|no|without|excluding)\s+(?:any\s+)?(?:personnel hoisting|hoisting personnel|personnel lifting|lifting personnel)\b/gi, '')
    .replace(/\b(?:not|no|without|excluding)\s+(?:crane\s+)?(?:assembly|disassembly|assembling|dismantling)\b/gi, '');
}

export function isApplicableStandard(row: OshaStandardMatch, query: string): boolean {
  const task = positiveTask(query);
  if (row.subpart_title === 'Steel Erection' && !/steel erection|erect\w*.*steel|structural steel/i.test(task)) return false;
  if (row.subpart_title === 'Underground Construction, Caissons, Cofferdams and Compressed Air' && !/tunnel|shaft|caisson|cofferdam|compressed air/i.test(task)) return false;
  if (row.citation === '1926.1431' && !/(hoist|lift)\w*\s+(personnel|employees|workers|people)|personnel (?:platform|hoist|lift)|man basket/i.test(task)) return false;
  if (row.subpart_title === 'Cranes and Derricks in Construction' && !/crane|derrick/i.test(task)) return false;
  if (['1926.1403', '1926.1404', '1926.1405', '1926.1406', '1926.1407'].includes(row.citation) && !/\b(assembl\w*|disassembl\w*|dismantl\w*|erect\w*)\b.{0,50}\b(crane|derrick|boom|jib)\b|\b(crane|derrick|boom|jib)\b.{0,50}\b(assembl\w*|disassembl\w*|dismantl\w*)\b/i.test(task)) return false;
  // This section governs access/fall protection ON the crane, not an adjacent roof.
  if (row.citation === '1926.1423' && !/(?:climb|access|walk|work)\w*.{0,30}(?:on|onto|inside) (?:the )?crane|crane (?:access|walkway|cab)/i.test(task)) return false;
  if (row.subpart_title === 'Electric Power Transmission and Distribution' && !/transmission|distribution|substation|power[- ]line work|lineworker/i.test(task)) return false;
  return true;
}

export function priorityCitations(query: string): string[] {
  const risks = getRiskSignals(query);
  const citations: string[] = [];
  if (risks.includes('excavation')) citations.push('1926.651', '1926.652');
  if (/crane|derrick/i.test(query)) {
    if (/power[- ]?line|voltage|overhead/i.test(query)) citations.push('1926.1408', '1926.1409');
    citations.push('1926.1425', '1926.1417');
  }
  if (risks.includes('fall')) citations.push('1926.501', '1926.502');
  if (risks.includes('electrical') && !/crane|derrick/i.test(query)) citations.push('1926.416', '1926.417');
  if (risks.includes('confined_space')) citations.push('1926.1203', '1926.1204');
  return [...new Set(citations)];
}

export function standardTitle(row: OshaStandardMatch): string {
  return row.text.match(/^#+\s*1926\.[\w.]+\s*[-–—]\s*(.+)$/m)?.[1]?.trim() || `29 CFR ${row.citation}`;
}

// Select whole paragraphs from across the source, retaining neighboring scope and
// exception context. Short standards (including 1926.651) are included in full.
export function selectEvidence(row: OshaStandardMatch, query: string, budget = 16000): string {
  if (row.text.length <= budget) return row.text;
  const paragraphs = row.text.split(/\n\s*\n/).map(text => text.trim()).filter(Boolean);
  const words = new Set(query.toLowerCase().match(/[a-z]{4,}/g) || []);
  const keyControls = /egress|25 feet|2 feet|rainstorm|inspection|water accumulation|cave-in|protective system|power line|voltage|clearance|minimum approach|Table A|fall protection|exceptions?/i;
  const ranked = paragraphs.map((text, index) => ({ index, score: [...words].filter(w => text.toLowerCase().includes(w)).length + (keyControls.test(text) ? 12 : 0) })).sort((a, b) => b.score - a.score || a.index - b.index);
  const selected = new Set<number>();
  let used = 0;
  const add = (indices: number[]) => {
    const fresh = [...new Set(indices)].filter(i => i >= 0 && i < paragraphs.length && !selected.has(i));
    const cost = fresh.reduce((total, i) => total + paragraphs[i].length + 2, 0);
    if (used + cost > budget) return;
    fresh.forEach(i => selected.add(i)); used += cost;
  };
  add([0, 1, 2]);
  for (const { index } of ranked) add([index - 1, index, index + 1]);
  return [...selected].sort((a, b) => a - b).map(i => paragraphs[i]).join('\n\n[... paragraph boundary ...]\n\n');
}

export function buildV2StandardsPrompt(standards: OshaStandardMatch[], query: string): string {
  return `\nApplicable source candidates (verify each claim against the actual passage; excerpts are not complete standards):\n${standards.map(s => `[${s.citation} — ${standardTitle(s)}]\n${selectEvidence(s, query)}`).join('\n\n')}\n
Cite ONLY these sources, and only where the passage supports the specific action and task.
Append (1926.x) to each supported item. Do not cite introductions or general summaries.
For each citation provide the section keys where it actually appears and a short verbatim supporting_quote from the passage.
An official source is not automatically applicable. Omit unsupported citations.
Prioritize life-critical controls over brevity. For trench entry, address protection, egress distances, spoil setback/retaining devices, competent-person inspection timing, and accumulated water when applicable. Preserve relevant exceptions and conditions; do not invent site facts.\n`;
}
