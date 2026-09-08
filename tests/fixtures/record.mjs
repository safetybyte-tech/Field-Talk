export const user = { id: '00000000-0000-4000-8000-000000000001', name: 'QA Reviewer', email: 'reviewer@example.com', user_metadata: { name: 'QA Reviewer' } };
export const content = {
  i: 'Connect sewer pipe in an eight-foot trench after rain. No entry until the controls below are verified.',
  hazards: ['Cave-in in an unprotected trench', 'Water accumulation after rain', 'Spoil and excavator loads near the edge', 'Unsafe access and egress'],
  practices: ['Provide a ladder within 25 feet of lateral travel (1926.651)', 'Keep spoil at least 2 feet from the edge (1926.651)', 'A competent person must inspect before work and after rainstorms (1926.651)', 'Inspect utilities and isolate nearby excavator operations'],
  ppe: ['Wear a hard hat, protective boots, gloves and high-visibility clothing.'],
  sif: ['Install an adequate protective system before entry (1926.652)', 'Do not enter while water accumulates without adequate precautions.', 'Use shields or shoring selected for the ground conditions.', 'Maintain protection and safe access throughout the work.'],
  manual: ['Stage pipe outside the trench and secure it against movement.'],
  q: ['Who will inspect the trench after changing conditions?'],
  citations: [{ citation: '1926.651', title: 'Specific excavation requirements', subpart_title: 'Excavations', source_url: 'https://www.ecfr.gov/current/title-29/section-1926.651', sections: ['practices'] }, { citation: '1926.652', title: 'Requirements for protective systems', subpart_title: 'Excavations', source_url: 'https://www.ecfr.gov/current/title-29/section-1926.652', sections: ['sif'] }],
};
export function record() {
  return { id: '00000000-0000-4000-8000-000000000002', title: 'QA wet trench review', content: JSON.stringify(content), date: '2026-09-08', location: 'Synthetic site', projectNumber: 'QA', weather: 'Rain', notes: 'Enter an 8-foot trench after rain with water collecting at the bottom.', supervisor: user.name, supervisorEmail: user.email, attendees: [{ id: 'a', name: 'Synthetic crew member', present: true }], recipients: [{ id: 'r', name: 'Synthetic recipient', email: 'recipient@example.com', selected: true }], createdAt: 1788825600000, harness: { version: 'harness-v2', retrieval: { status: 'grounded', sourceCount: 2, citations: ['1926.651', '1926.652'] }, validation: [], persisted: true } };
}
