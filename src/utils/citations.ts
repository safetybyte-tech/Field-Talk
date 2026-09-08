export function officialCitations(value: unknown): { citation: string; source_url: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    if (!item || typeof item.citation !== 'string' || typeof item.source_url !== 'string') return [];
    try {
      const url = new URL(item.source_url);
      return url.protocol === 'https:' && ['www.ecfr.gov', 'ecfr.gov', 'www.osha.gov', 'osha.gov'].includes(url.hostname)
        ? [{ citation: item.citation, source_url: url.href }] : [];
    } catch { return []; }
  });
}

export function citationsHtml(value: unknown): string {
  const citations = officialCitations(value);
  if (!citations.length) return '';
  const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  return `<section><h2>Referenced OSHA Standards</h2><ul>${citations.map(c => `<li><a href="${escape(c.source_url)}">29 CFR ${escape(c.citation)}</a></li>`).join('')}</ul><p>Source text is unofficial. Verify requirements against the linked official standards.</p></section>`;
}
