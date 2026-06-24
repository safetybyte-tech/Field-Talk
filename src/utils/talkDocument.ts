import { StructuredTalkContent, ToolboxTalk } from '../types';

type StructuredTalkKey = keyof StructuredTalkContent;

const sectionLabels: Record<Exclude<StructuredTalkKey, 'i'>, string> = {
  hazards: 'Hazards',
  practices: 'Pre-Task Planning',
  ppe: 'Personal Protective Equipment',
  sif: 'Serious Injury/Fatality Prevention',
  manual: 'Material Handling',
  q: 'Discussion Questions',
};

const sectionKeys = Object.keys(sectionLabels) as Exclude<StructuredTalkKey, 'i'>[];

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const toParagraphs = (value: string): string =>
  value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
    .join('');

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const parseStructuredTalkContent = (content: string): StructuredTalkContent | null => {
  try {
    const parsed = JSON.parse(content) as Partial<Record<StructuredTalkKey, unknown>>;
    if (
      typeof parsed.i === 'string' &&
      isStringArray(parsed.hazards) &&
      isStringArray(parsed.practices) &&
      isStringArray(parsed.ppe) &&
      isStringArray(parsed.sif) &&
      isStringArray(parsed.manual) &&
      isStringArray(parsed.q)
    ) {
      return parsed as StructuredTalkContent;
    }
  } catch {
    return null;
  }

  return null;
};

const formatDate = (date: string): string => {
  if (!date) return 'Not set';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const renderStructuredContent = (content: StructuredTalkContent): string => `
  <section class="content-section">
    <h2>Introduction</h2>
    <p>${escapeHtml(content.i)}</p>
  </section>
  ${sectionKeys
    .map((key) => {
      const items = content[key].filter((item) => item.trim());
      if (items.length === 0) return '';

      return `
        <section class="content-section">
          <h2>${sectionLabels[key]}</h2>
          <ul>
            ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </section>
      `;
    })
    .join('')}
`;

const renderPlainContent = (content: string): string => `
  <section class="content-section">
    <h2>Talk Content</h2>
    ${toParagraphs(content) || '<p>No talk content recorded.</p>'}
  </section>
`;

export const buildTalkDocumentHtml = (talk: ToolboxTalk): string => {
  const structuredContent = parseStructuredTalkContent(talk.content);
  const selectedRecipients = talk.recipients.filter((recipient) => recipient.selected);
  const presentAttendees = talk.attendees.filter((attendee) => attendee.present);
  const absentAttendees = talk.attendees.filter((attendee) => !attendee.present);
  const submittedAt = talk.submittedAt ? new Date(talk.submittedAt).toLocaleString() : 'Draft';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(talk.title || 'Toolbox Talk Record')}</title>
  <style>
    @page { size: letter; margin: 0.55in; }
    * { box-sizing: border-box; }
    body {
      color: #1f2937;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
    }
    header {
      border-bottom: 3px solid #2563eb;
      margin-bottom: 18px;
      padding-bottom: 12px;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      line-height: 1.2;
      margin: 0 0 6px;
    }
    h2 {
      color: #1d4ed8;
      font-size: 15px;
      margin: 0 0 8px;
    }
    p { margin: 0 0 8px; }
    ul { margin: 0; padding-left: 18px; }
    li { margin-bottom: 4px; }
    .meta-grid {
      display: grid;
      gap: 8px;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      margin-bottom: 16px;
    }
    .meta-item, .content-section, .table-section {
      border: 1px solid #d1d5db;
      border-radius: 6px;
      break-inside: avoid;
      padding: 10px;
    }
    .label {
      color: #4b5563;
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .value {
      color: #111827;
      font-weight: 600;
    }
    .content-section, .table-section { margin-bottom: 12px; }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border-bottom: 1px solid #e5e7eb;
      padding: 7px 6px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #374151;
      font-size: 10px;
      text-transform: uppercase;
    }
    tr:last-child td { border-bottom: 0; }
    .muted { color: #6b7280; }
    .signature-line {
      border-bottom: 1px solid #9ca3af;
      min-height: 18px;
      min-width: 120px;
    }
    footer {
      border-top: 1px solid #d1d5db;
      color: #6b7280;
      font-size: 10px;
      margin-top: 18px;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <header>
    <h1>${escapeHtml(talk.title || 'Toolbox Talk Record')}</h1>
    <p class="muted">Field Talk safety record</p>
  </header>

  <section class="meta-grid">
    <div class="meta-item"><span class="label">Date</span><span class="value">${escapeHtml(formatDate(talk.date))}</span></div>
    <div class="meta-item"><span class="label">Location</span><span class="value">${escapeHtml(talk.location || 'Not set')}</span></div>
    <div class="meta-item"><span class="label">Project Number</span><span class="value">${escapeHtml(talk.projectNumber || 'Not set')}</span></div>
    <div class="meta-item"><span class="label">Weather</span><span class="value">${escapeHtml(talk.weather || 'Not set')}</span></div>
    <div class="meta-item"><span class="label">Supervisor</span><span class="value">${escapeHtml(talk.supervisor || 'Not set')}</span></div>
    <div class="meta-item"><span class="label">Supervisor Email</span><span class="value">${escapeHtml(talk.supervisorEmail || 'Not set')}</span></div>
  </section>

  ${structuredContent ? renderStructuredContent(structuredContent) : renderPlainContent(talk.content)}

  <section class="table-section">
    <h2>Attendance</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Status</th><th>Signature</th></tr>
      </thead>
      <tbody>
        ${
          talk.attendees.length > 0
            ? talk.attendees
                .map(
                  (attendee) => `
                    <tr>
                      <td>${escapeHtml(attendee.name)}${attendee.isTemporary ? ' <span class="muted">(temporary)</span>' : ''}</td>
                      <td>${attendee.present ? 'Present' : 'Absent'}</td>
                      <td>${attendee.signature ? escapeHtml(attendee.signature) : '<div class="signature-line"></div>'}</td>
                    </tr>
                  `
                )
                .join('')
            : '<tr><td colspan="3" class="muted">No attendees recorded.</td></tr>'
        }
      </tbody>
    </table>
    <p class="muted">${presentAttendees.length} present, ${absentAttendees.length} absent</p>
  </section>

  <section class="table-section">
    <h2>Email Distribution</h2>
    <table>
      <thead>
        <tr><th>Name</th><th>Email</th></tr>
      </thead>
      <tbody>
        ${
          selectedRecipients.length > 0
            ? selectedRecipients
                .map(
                  (recipient) => `
                    <tr>
                      <td>${escapeHtml(recipient.name)}</td>
                      <td>${escapeHtml(recipient.email)}</td>
                    </tr>
                  `
                )
                .join('')
            : '<tr><td colspan="2" class="muted">No recipients selected.</td></tr>'
        }
      </tbody>
    </table>
  </section>

  <footer>Status: ${escapeHtml(submittedAt)}. Generated by Field Talk.</footer>
</body>
</html>`;
};

export const openTalkPdf = (talk: ToolboxTalk): void => {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Pop-up blocked. Allow pop-ups for Field Talk to save a PDF.');
  }

  printWindow.document.open();
  printWindow.document.write(buildTalkDocumentHtml(talk));
  printWindow.document.close();
  printWindow.focus();

  window.setTimeout(() => {
    printWindow.print();
  }, 250);
};
