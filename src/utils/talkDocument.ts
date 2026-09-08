import { StructuredTalkContent, ToolboxTalk } from '../types';
import { jsPDF } from 'jspdf';
import { citationsHtml, officialCitations } from './citations';
import { approvalText, hasCurrentApproval, reviewMessages, REVIEW_DISCLAIMER } from './recordReview';
import { parseStructuredTalkContent } from './talkContent';
export { parseStructuredTalkContent } from './talkContent';

type StructuredTalkKey = keyof StructuredTalkContent;

const sectionLabels: Record<Exclude<StructuredTalkKey, 'i' | 'citations'>, string> = {
  hazards: 'Hazards',
  practices: 'Pre-Task Planning',
  ppe: 'Personal Protective Equipment',
  sif: 'Serious Injury/Fatality Prevention',
  manual: 'Material Handling',
  q: 'Discussion Questions',
};

const sectionKeys = Object.keys(sectionLabels) as Exclude<StructuredTalkKey, 'i' | 'citations'>[];

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
      color: #1A1A1A;
      font-family: Inter, Arial, Helvetica, sans-serif;
      font-size: 12px;
      line-height: 1.45;
      margin: 0;
    }
    header {
      border-bottom: 2px solid #1A1A1A;
      margin-bottom: 18px;
      padding-bottom: 12px;
    }
    h1 {
      color: #1A1A1A;
      font-size: 24px;
      line-height: 1.2;
      margin: 0 0 6px;
    }
    h2 {
      color: #1A1A1A;
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
      border: 1px solid #E8E3DC;
      border-radius: 0;
      break-inside: avoid;
      padding: 10px;
    }
    .label {
      color: #6B7280;
      font-family: "IBM Plex Mono", monospace;
      display: block;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.02em;
      text-transform: uppercase;
    }
    .value {
      color: #1A1A1A;
      font-weight: 600;
    }
    .content-section, .table-section { margin-bottom: 12px; }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    th, td {
      border-bottom: 1px solid #E8E3DC;
      padding: 7px 6px;
      text-align: left;
      vertical-align: top;
    }
    th {
      color: #6B7280;
      font-family: "IBM Plex Mono", monospace;
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
    .eyebrow { color: #F97316; font-family: "IBM Plex Mono", monospace; font-size: 10px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
    .certification { background: #FAF7F2; border-left: 3px solid #F97316; break-inside: avoid; margin-bottom: 12px; padding: 12px; }
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
    <p class="eyebrow">Safety Net Dispatch · Field Talk</p>
    <h1>${escapeHtml(talk.title || 'Toolbox Talk Record')}</h1>
    <p class="muted">${hasCurrentApproval(talk) ? 'Signed Toolbox Talk Record' : 'DRAFT - NOT APPROVED'} · ${escapeHtml(talk.date || 'Date not set')}</p>
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
  ${citationsHtml(structuredContent?.citations)}
  <section><h2>Draft review</h2><p>${escapeHtml(REVIEW_DISCLAIMER)}</p><ul>${reviewMessages(talk).map(message => `<li>${escapeHtml(message)}</li>`).join('')}</ul></section>

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

  <section class="certification">${approvalText(talk).map(line => `<p>${escapeHtml(line)}</p>`).join('')}</section>

  <footer>Status: ${escapeHtml(submittedAt)}. Standards text is unofficial; verify at ecfr.gov. Generated by Field Talk, a Safety Net Dispatch tool.</footer>
</body>
</html>`;
};

const pdfSafeText = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\n]/g, '');

const talkFileName = (talk: ToolboxTalk): string => {
  const title = (talk.title || 'toolbox-talk')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
  return `${talk.date || 'undated'}-${title || 'toolbox-talk'}.pdf`;
};

export const createTalkPdf = (talk: ToolboxTalk): jsPDF => {
  const pdf = new jsPDF({ format: 'letter', unit: 'mm' });
  const margin = 15;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const ensureSpace = (height: number) => {
    if (y + height <= pageHeight - margin) return;
    pdf.addPage();
    y = margin;
  };

  const writeLines = (lines: string[], fontSize = 10, bold = false, gap = 4.8) => {
    pdf.setFont('helvetica', bold ? 'bold' : 'normal');
    pdf.setFontSize(fontSize);
    lines.forEach((line) => {
      ensureSpace(gap);
      pdf.text(line, margin, y);
      y += gap;
    });
  };

  const writeParagraph = (value: string, fontSize = 10) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(pdfSafeText(value), contentWidth) as string[];
    writeLines(lines, fontSize);
    y += 1.5;
  };

  const writeHeading = (value: string, level: 1 | 2 = 2) => {
    const fontSize = level === 1 ? 18 : 12;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(fontSize);
    const lines = pdf.splitTextToSize(pdfSafeText(value), contentWidth) as string[];
    ensureSpace(lines.length * (level === 1 ? 7 : 6) + 4);
    pdf.setTextColor(26, 26, 26);
    writeLines(lines, fontSize, true, level === 1 ? 7 : 6);
    pdf.setTextColor(26, 26, 26);
    y += 1;
  };

  const writeBullets = (items: string[]) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    items.filter((item) => item.trim()).forEach((item) => {
      const lines = pdf.splitTextToSize(pdfSafeText(item), contentWidth - 5) as string[];
      lines.forEach((line, index) => {
        ensureSpace(4.8);
        if (index === 0) pdf.text('-', margin, y);
        pdf.text(line, margin + 4, y);
        y += 4.8;
      });
    });
    y += 1.5;
  };

  pdf.setTextColor(249, 115, 22);
  writeLines(['SAFETY NET DISPATCH · FIELD TALK'], 9, true);
  y += 3;
  pdf.setTextColor(26, 26, 26);
  writeHeading(talk.title || 'Toolbox Talk Record', 1);
  pdf.setTextColor(75, 81, 88);
  writeLines([hasCurrentApproval(talk) ? 'Signed Toolbox Talk Record' : 'DRAFT - NOT APPROVED'], 9);
  pdf.setTextColor(26, 26, 26);
  y += 2;

  const metadata = [
    ['Date', formatDate(talk.date)],
    ['Location', talk.location || 'Not set'],
    ['Project Number', talk.projectNumber || 'Not set'],
    ['Weather', talk.weather || 'Not set'],
    ['Supervisor', talk.supervisor || 'Not set'],
    ['Supervisor Email', talk.supervisorEmail || 'Not set'],
  ];
  metadata.forEach(([label, value]) => {
    const lines = pdf.splitTextToSize(pdfSafeText(value), contentWidth - 38) as string[];
    ensureSpace(Math.max(6, lines.length * 4.8));
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(`${label}:`, margin, y);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    lines.forEach((line, index) => pdf.text(line, margin + 36, y + index * 4.8));
    y += Math.max(6, lines.length * 4.8);
  });
  y += 2;

  const structuredContent = parseStructuredTalkContent(talk.content);
  if (structuredContent) {
    writeHeading('Introduction');
    writeParagraph(structuredContent.i);
    sectionKeys.forEach((key) => {
      if (structuredContent[key].some((item) => item.trim())) {
        writeHeading(sectionLabels[key]);
        writeBullets(structuredContent[key]);
      }
    });
  } else {
    writeHeading('Talk Content');
    const paragraphs = talk.content.split(/\n{2,}/).filter((paragraph) => paragraph.trim());
    if (paragraphs.length) paragraphs.forEach((paragraph) => writeParagraph(paragraph));
    else writeParagraph('No talk content recorded.');
  }

  const citations = officialCitations(structuredContent?.citations);
  if (citations.length) {
    writeHeading('Referenced OSHA Standards');
    citations.forEach(citation => {
      ensureSpace(12);
      writeParagraph(`29 CFR ${citation.citation}${citation.title ? ` - ${citation.title}` : ''}`, 9);
      pdf.setFontSize(8);
      const lines = pdf.splitTextToSize(citation.source_url, contentWidth) as string[];
      lines.forEach(line => {
        ensureSpace(4.8);
        pdf.setTextColor(30, 64, 175);
        pdf.textWithLink(line, margin, y, { url: citation.source_url });
        y += 4.8;
      });
      pdf.setTextColor(26, 26, 26);
      y += 1.5;
    });
    writeParagraph('Source text is unofficial. Verify requirements against the linked official standards.', 9);
  }
  writeHeading('Draft Review');
  writeParagraph(REVIEW_DISCLAIMER, 9);
  const messages = reviewMessages(talk);
  if (messages.length) writeBullets(messages);

  writeHeading('Attendance');
  if (talk.attendees.length) {
    talk.attendees.forEach((attendee) => {
      writeParagraph(`${attendee.name || 'Unnamed attendee'} — ${attendee.present ? 'Present' : 'Absent'}${attendee.signature ? ` — Signature: ${attendee.signature}` : ''}`, 9);
    });
  } else {
    writeParagraph('No attendees recorded.', 9);
  }
  const presentCount = talk.attendees.filter((attendee) => attendee.present).length;
  writeParagraph(`${presentCount} present, ${talk.attendees.length - presentCount} absent`, 9);

  const recipients = talk.recipients.filter((recipient) => recipient.selected);
  writeHeading('Email Distribution');
  if (recipients.length) recipients.forEach((recipient) => writeParagraph(`${recipient.name} <${recipient.email}>`, 9));
  else writeParagraph('No recipients selected.', 9);

  const signature = approvalText(talk);
  writeHeading(signature[0]);
  signature.slice(1).forEach(line => writeParagraph(line, 9));

  pdf.setProperties({
    title: pdfSafeText(talk.title || 'Toolbox Talk Record'),
    subject: 'Field Talk safety record',
    author: 'Field Talk',
  });
  return pdf;
};

export const createTalkPdfAttachment = (talk: ToolboxTalk): { filename: string; content: string } => {
  const dataUri = createTalkPdf(talk).output('datauristring') as string;
  const [, content = ''] = dataUri.split(',', 2);
  if (!content) throw new Error('Unable to generate the toolbox-talk PDF.');
  return { filename: talkFileName(talk), content };
};

export const openTalkPdf = (talk: ToolboxTalk): void => {
  createTalkPdf(talk).save(talkFileName(talk));
};
