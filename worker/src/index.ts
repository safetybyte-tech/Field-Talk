interface Env {
  OPENAI_API_KEY: string;
  OPENAI_MODEL?: string;
  OPENAI_EMBEDDING_MODEL?: string;
  OSHA_MATCH_THRESHOLD?: string;
  OSHA_MATCH_COUNT?: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CORS_ORIGIN: string;
  DAILY_LIMIT: string;
  RESEND_API_KEY?: string;
  RESEND_FROM_EMAIL?: string;
  RESEND_FROM_NAME?: string;
}

interface SupabaseUser {
  id: string;
  email: string;
}

interface TalkCitation {
  citation: string;
  subpart_title: string;
  source_url: string;
  sections: string[];
}

interface StructuredTalkContent {
  i: string;
  hazards: string[];
  practices: string[];
  ppe: string[];
  sif: string[];
  manual: string[];
  q: string[];
  citations?: TalkCitation[];
}

interface OshaStandardMatch {
  citation: string;
  subpart: string | null;
  subpart_title: string | null;
  source_url: string;
  text: string;
  similarity: number;
}

interface Recipient {
  id: string;
  name: string;
  email: string;
  selected: boolean;
  isDefault?: boolean;
}

interface Attendee {
  id: string;
  name: string;
  present: boolean;
  isTemporary?: boolean;
  signature?: string;
}

interface ToolboxTalk {
  id: string;
  title: string;
  content: string;
  date: string;
  location: string;
  projectNumber: string;
  weather: string;
  supervisor: string;
  supervisorEmail: string;
  attendees: Attendee[];
  recipients: Recipient[];
  createdAt: number;
  submittedAt?: number;
}

interface OpenAIResponsesData {
  output_text?: string;
  output?: {
    content?: {
      text?: string;
      type?: string;
    }[];
  }[];
  usage?: {
    total_tokens?: number;
  };
}

const structuredTalkSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['i', 'hazards', 'practices', 'ppe', 'sif', 'manual', 'q'],
  properties: {
    i: { type: 'string' },
    hazards: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' },
    },
    practices: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' },
    },
    ppe: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' },
    },
    sif: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' },
    },
    manual: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' },
    },
    q: {
      type: 'array',
      maxItems: 4,
      items: { type: 'string' },
    },
  },
};

const TALK_SECTION_KEYS = ['i', 'hazards', 'practices', 'ppe', 'sif', 'manual', 'q'];

/** Cap how much regulatory text goes into the prompt per matched standard. */
const STANDARD_PROMPT_CHAR_LIMIT = 1500;

/** Build the response schema, adding a citations field only when standards were retrieved. */
function buildTalkSchema(retrievedCitations: string[]) {
  if (retrievedCitations.length === 0) return structuredTalkSchema;

  return {
    ...structuredTalkSchema,
    required: [...structuredTalkSchema.required, 'citations'],
    properties: {
      ...structuredTalkSchema.properties,
      citations: {
        type: 'array',
        maxItems: 5,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['citation', 'sections'],
          properties: {
            // Enum keeps the model from inventing citation numbers.
            citation: { type: 'string', enum: retrievedCitations },
            sections: {
              type: 'array',
              items: { type: 'string', enum: TALK_SECTION_KEYS },
            },
          },
        },
      },
    },
  };
}

/** Embed text with the same model the sync script uses for the corpus. */
async function embedText(text: string, env: Env): Promise<number[] | null> {
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small',
      input: text.slice(0, 8000),
      dimensions: 1536,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const embedding = data.data?.[0]?.embedding;
  return Array.isArray(embedding) ? embedding : null;
}

/**
 * Retrieve OSHA 1926 standards relevant to the work description via pgvector.
 * Fails soft: any error returns an empty list so generation still works.
 */
async function retrieveOshaStandards(workDescription: string, env: Env): Promise<OshaStandardMatch[]> {
  try {
    const embedding = await embedText(workDescription, env);
    if (!embedding) return [];

    const threshold = parseFloat(env.OSHA_MATCH_THRESHOLD || '') || 0.4;
    const count = parseInt(env.OSHA_MATCH_COUNT || '', 10) || 4;

    const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/match_osha_standards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: env.SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count,
      }),
    });
    if (!res.ok) return [];

    const rows = (await res.json()) as OshaStandardMatch[];
    return Array.isArray(rows) ? rows.filter((row) => row?.citation && row?.source_url) : [];
  } catch {
    return [];
  }
}

/** System prompt block listing the retrieved standards and the citation rules. */
function buildStandardsPrompt(standards: OshaStandardMatch[]): string {
  const list = standards
    .map((s) => {
      const title = s.subpart_title ? ` — ${s.subpart_title}` : '';
      return `[${s.citation}${title}]\n${s.text.slice(0, STANDARD_PROMPT_CHAR_LIMIT)}`;
    })
    .join('\n\n');

  return `

Relevant OSHA 29 CFR Part 1926 standards for this task (the ONLY standards you may cite):

${list}

Citation rules:
- When an item is directly supported by one of the standards above, append its citation in parentheses at the end of the item, e.g. "(1926.501)". The citation does not count toward the 12-word limit.
- Cite ONLY citation numbers from the list above. Never cite, mention, or invent any other standard.
- If a standard above is not relevant to an item, do not cite it. Not every item needs a citation.
- List each citation you used in the "citations" field, with the section keys ("i", "hazards", "practices", "ppe", "sif", "manual", "q") where it appears. Leave "citations" empty if you cited nothing.`;
}

/** Strip any inline 1926.x citation that is not in the retrieved set. */
function stripUnknownCitations(text: string, allowed: Set<string>): string {
  return text
    .replace(/\(?\s*(?:29\s*CFR\s*)?(1926\.\d+)(?:\([a-zA-Z0-9]+\))*\s*\)?/g, (match, base: string) =>
      allowed.has(base) ? match : ' '
    )
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([.,;:)])/g, '$1')
    .trim();
}

function corsHeaders(origin: string) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function jsonResponse(body: unknown, status: number, origin: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function extractResponseText(openaiData: OpenAIResponsesData): string {
  if (openaiData.output_text) return openaiData.output_text;

  return openaiData.output
    ?.flatMap((item) => item.content || [])
    .map((content) => content.text || '')
    .join('')
    .trim() || '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function parseStructuredTalkContent(content: string): StructuredTalkContent | null {
  try {
    const parsed = JSON.parse(content) as Partial<Record<keyof StructuredTalkContent, unknown>>;
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
}

function formatDate(date: string): string {
  if (!date) return 'Not set';
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(timestamp?: number): string {
  return timestamp ? new Date(timestamp).toLocaleString('en-US') : 'Draft';
}

function renderPlainContent(content: string): string {
  return content
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .join('\n\n') || 'No talk content recorded.';
}

function renderStructuredText(content: StructuredTalkContent): string {
  const sections: [string, string[]][] = [
    ['Hazards', content.hazards],
    ['Pre-Task Planning', content.practices],
    ['Personal Protective Equipment', content.ppe],
    ['Serious Injury/Fatality Prevention', content.sif],
    ['Material Handling', content.manual],
    ['Discussion Questions', content.q],
  ];

  return [
    `Introduction\n${content.i}`,
    ...sections.map(([title, items]) => `${title}\n${items.map((item) => `- ${item}`).join('\n')}`),
  ].join('\n\n');
}

function renderStructuredHtml(content: StructuredTalkContent): string {
  const sections: [string, string[]][] = [
    ['Hazards', content.hazards],
    ['Pre-Task Planning', content.practices],
    ['Personal Protective Equipment', content.ppe],
    ['Serious Injury/Fatality Prevention', content.sif],
    ['Material Handling', content.manual],
    ['Discussion Questions', content.q],
  ];

  return `
    <section>
      <h2>Introduction</h2>
      <p>${escapeHtml(content.i)}</p>
    </section>
    ${sections
      .map(([title, items]) => `
        <section>
          <h2>${escapeHtml(title)}</h2>
          <ul>${items.filter((item) => item.trim()).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
        </section>
      `)
      .join('')}
  `;
}

function buildTalkEmail(talk: ToolboxTalk): { subject: string; text: string; html: string } {
  const structuredContent = parseStructuredTalkContent(talk.content);
  const selectedRecipients = talk.recipients.filter((recipient) => recipient.selected);
  const presentAttendees = talk.attendees.filter((attendee) => attendee.present);
  const absentAttendees = talk.attendees.filter((attendee) => !attendee.present);
  const contentText = structuredContent ? renderStructuredText(structuredContent) : renderPlainContent(talk.content);
  const contentHtml = structuredContent
    ? renderStructuredHtml(structuredContent)
    : `<section><h2>Talk Content</h2>${renderPlainContent(talk.content)
        .split('\n\n')
        .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`)
        .join('')}</section>`;

  const subject = `Toolbox Talk: ${talk.title || formatDate(talk.date)}`;
  const text = [
    subject,
    '',
    `Date: ${formatDate(talk.date)}`,
    `Location: ${talk.location || 'Not set'}`,
    `Project Number: ${talk.projectNumber || 'Not set'}`,
    `Weather: ${talk.weather || 'Not set'}`,
    `Supervisor: ${talk.supervisor || 'Not set'} <${talk.supervisorEmail || 'not set'}>`,
    `Submitted: ${formatTimestamp(talk.submittedAt)}`,
    '',
    contentText,
    '',
    `Attendance: ${presentAttendees.length} present, ${absentAttendees.length} absent`,
    ...talk.attendees.map((attendee) => `- ${attendee.name}: ${attendee.present ? 'Present' : 'Absent'}`),
    '',
    'Email Distribution:',
    ...selectedRecipients.map((recipient) => `- ${recipient.name} <${recipient.email}>`),
  ].join('\n');

  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <style>
    body { color: #1f2937; font-family: Arial, Helvetica, sans-serif; font-size: 14px; line-height: 1.45; margin: 0; padding: 24px; }
    h1 { color: #111827; font-size: 24px; margin: 0 0 4px; }
    h2 { color: #1d4ed8; font-size: 16px; margin: 0 0 8px; }
    section, .meta, table { margin: 0 0 16px; }
    .meta { border: 1px solid #d1d5db; border-radius: 6px; padding: 12px; }
    .label { color: #4b5563; font-weight: 700; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #e5e7eb; padding: 8px; text-align: left; }
    th { color: #374151; font-size: 12px; text-transform: uppercase; }
  </style>
</head>
<body>
  <h1>${escapeHtml(talk.title || 'Toolbox Talk Record')}</h1>
  <p>Field Talk safety record</p>
  <div class="meta">
    <p><span class="label">Date:</span> ${escapeHtml(formatDate(talk.date))}</p>
    <p><span class="label">Location:</span> ${escapeHtml(talk.location || 'Not set')}</p>
    <p><span class="label">Project Number:</span> ${escapeHtml(talk.projectNumber || 'Not set')}</p>
    <p><span class="label">Weather:</span> ${escapeHtml(talk.weather || 'Not set')}</p>
    <p><span class="label">Supervisor:</span> ${escapeHtml(talk.supervisor || 'Not set')} (${escapeHtml(talk.supervisorEmail || 'not set')})</p>
    <p><span class="label">Submitted:</span> ${escapeHtml(formatTimestamp(talk.submittedAt))}</p>
  </div>
  ${contentHtml}
  <section>
    <h2>Attendance</h2>
    <table>
      <thead><tr><th>Name</th><th>Status</th></tr></thead>
      <tbody>
        ${
          talk.attendees.length > 0
            ? talk.attendees.map((attendee) => `<tr><td>${escapeHtml(attendee.name)}</td><td>${attendee.present ? 'Present' : 'Absent'}</td></tr>`).join('')
            : '<tr><td colspan="2">No attendees recorded.</td></tr>'
        }
      </tbody>
    </table>
    <p>${presentAttendees.length} present, ${absentAttendees.length} absent</p>
  </section>
  <section>
    <h2>Email Distribution</h2>
    <table>
      <thead><tr><th>Name</th><th>Email</th></tr></thead>
      <tbody>
        ${selectedRecipients.map((recipient) => `<tr><td>${escapeHtml(recipient.name)}</td><td>${escapeHtml(recipient.email)}</td></tr>`).join('')}
      </tbody>
    </table>
  </section>
</body>
</html>`;

  return { subject, text, html };
}

/** Verify a Supabase JWT by calling the auth endpoint. */
async function verifyToken(token: string, supabaseUrl: string, serviceKey: string): Promise<SupabaseUser | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: serviceKey,
    },
  });
  if (!res.ok) return null;
  const user = (await res.json()) as { id: string; email: string };
  return user?.id ? user : null;
}

/** Check daily usage via Supabase RPC. */
async function getDailyUsage(userId: string, supabaseUrl: string, serviceKey: string): Promise<number> {
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/get_daily_ai_usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ p_user_id: userId }),
  });
  if (!res.ok) return 0;
  const count = await res.json();
  return typeof count === 'number' ? count : 0;
}

/** Record usage in ai_usage table. */
async function recordUsage(userId: string, tokensUsed: number, supabaseUrl: string, serviceKey: string): Promise<void> {
  await fetch(`${supabaseUrl}/rest/v1/ai_usage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ user_id: userId, tokens_used: tokensUsed }),
  });
}

async function handleSendTalk(request: Request, env: Env, origin: string): Promise<Response> {
  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return jsonResponse(
      { error: 'Resend is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL on the worker.' },
      503,
      origin
    );
  }

  let talk: ToolboxTalk;
  try {
    const body = (await request.json()) as { talk?: ToolboxTalk };
    if (!body.talk) throw new Error('Missing talk');
    talk = body.talk;
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, origin);
  }

  const selectedRecipients = talk.recipients.filter((recipient) => recipient.selected);
  if (selectedRecipients.length === 0) {
    return jsonResponse({ error: 'At least one selected recipient is required.' }, 400, origin);
  }

  const invalidRecipient = selectedRecipients.find((recipient) => !isEmail(recipient.email));
  if (invalidRecipient) {
    return jsonResponse({ error: `Invalid recipient email: ${invalidRecipient.email}` }, 400, origin);
  }

  if (talk.supervisorEmail && !isEmail(talk.supervisorEmail)) {
    return jsonResponse({ error: `Invalid supervisor email: ${talk.supervisorEmail}` }, 400, origin);
  }

  const email = buildTalkEmail(talk);
  const from = env.RESEND_FROM_NAME
    ? `${env.RESEND_FROM_NAME} <${env.RESEND_FROM_EMAIL}>`
    : env.RESEND_FROM_EMAIL;
  const resendRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Idempotency-Key': `fieldtalk-${talk.id}-${talk.submittedAt || Date.now()}`,
    },
    body: JSON.stringify({
      from,
      to: selectedRecipients.map((recipient) => recipient.email),
      subject: email.subject,
      html: email.html,
      text: email.text,
      reply_to: talk.supervisorEmail || undefined,
      headers: {
        'X-FieldTalk-Talk-ID': talk.id,
      },
    }),
  });

  if (!resendRes.ok) {
    const errorBody = await resendRes.text();
    return jsonResponse(
      { error: `Resend error ${resendRes.status}: ${errorBody || resendRes.statusText}` },
      502,
      origin
    );
  }

  const resendData = await resendRes.json().catch(() => ({})) as { id?: string };
  return jsonResponse({ ok: true, id: resendData.id }, 200, origin);
}

async function handleGenerateTalk(request: Request, env: Env, origin: string, user: SupabaseUser): Promise<Response> {
  // 2. Check rate limit
  const dailyLimit = parseInt(env.DAILY_LIMIT, 10) || 20;
  const used = await getDailyUsage(user.id, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  if (used >= dailyLimit) {
    return jsonResponse(
      { error: `Daily limit of ${dailyLimit} AI generations reached. Try again tomorrow.`, usage: { used, limit: dailyLimit } },
      429,
      origin
    );
  }

  // 3. Parse request body
  let workDescription: string;
  try {
    const body = (await request.json()) as { workDescription?: string };
    workDescription = body.workDescription?.trim() || '';
  } catch {
    return jsonResponse({ error: 'Invalid request body' }, 400, origin);
  }

  if (!workDescription) {
    return jsonResponse({ error: 'workDescription is required' }, 400, origin);
  }

  // 4. Retrieve relevant OSHA standards (same rate-limited request; fails soft to no standards)
  const standards = await retrieveOshaStandards(workDescription, env);
  const retrievedCitations = standards.map((s) => s.citation);
  const standardsByCitation = new Map(standards.map((s) => [s.citation, s]));

  const basePrompt = `You are FieldTalk Formatter. Convert a short task description into a structured toolbox talk.

Rules:
- i = 1–2 sentences (intro).
- hazards/practices/ppe/sif/manual/q = arrays, max 4 items each.
- Each item ≤ 12 words, action-oriented.
- No markdown or explanations.`;

  const systemPrompt =
    standards.length > 0
      ? basePrompt + buildStandardsPrompt(standards)
      : basePrompt + '\n- No citations.';

  // 5. Call OpenAI
  const openaiRes = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.OPENAI_MODEL || 'gpt-5.4-mini',
      input: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `The task is ${workDescription}`,
        },
      ],
      max_output_tokens: standards.length > 0 ? 1100 : 800,
      text: {
        format: {
          type: 'json_schema',
          name: 'toolbox_talk',
          strict: true,
          schema: buildTalkSchema(retrievedCitations),
        },
      },
    }),
  });

  if (!openaiRes.ok) {
    const err = await openaiRes.json().catch(() => ({})) as { error?: { message?: string } };
    return jsonResponse(
      { error: err?.error?.message || `OpenAI error: ${openaiRes.status}` },
      502,
      origin
    );
  }

  const openaiData = (await openaiRes.json()) as OpenAIResponsesData;
  const rawContent = extractResponseText(openaiData);
  const tokensUsed = openaiData.usage?.total_tokens || 0;

  if (!rawContent) {
    return jsonResponse({ error: 'No content generated from OpenAI' }, 502, origin);
  }

  const parsedContent = parseStructuredTalkContent(rawContent);
  if (!parsedContent) {
    return jsonResponse({ error: 'OpenAI returned invalid toolbox talk JSON' }, 502, origin);
  }
  const talkContent = parsedContent as StructuredTalkContent & {
    citations?: { citation?: string; sections?: string[] }[];
  };

  // 6. Enforce citation grounding: only retrieved standards may be cited, and
  // citation metadata (title, eCFR link) comes from the database, not the model.
  const allowedCitations = new Set(retrievedCitations);
  talkContent.i = stripUnknownCitations(talkContent.i, allowedCitations);
  for (const key of ['hazards', 'practices', 'ppe', 'sif', 'manual', 'q'] as const) {
    talkContent[key] = talkContent[key]
      .map((item) => stripUnknownCitations(item, allowedCitations))
      .filter((item) => item.length > 0);
  }

  const mergedCitations = new Map<string, TalkCitation>();
  for (const modelCitation of talkContent.citations || []) {
    const standard = modelCitation.citation ? standardsByCitation.get(modelCitation.citation) : undefined;
    if (!standard) continue;
    const existing = mergedCitations.get(standard.citation);
    const sections = (modelCitation.sections || []).filter((s) => TALK_SECTION_KEYS.includes(s));
    if (existing) {
      existing.sections = [...new Set([...existing.sections, ...sections])];
    } else {
      mergedCitations.set(standard.citation, {
        citation: standard.citation,
        subpart_title: standard.subpart_title || '',
        source_url: standard.source_url,
        sections,
      });
    }
  }
  talkContent.citations = [...mergedCitations.values()];

  const content = JSON.stringify(talkContent);

  // 7. Record usage
  await recordUsage(user.id, tokensUsed, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  // 8. Return result
  return jsonResponse(
    { content, usage: { used: used + 1, limit: dailyLimit } },
    200,
    origin
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = env.CORS_ORIGIN || '*';

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405, origin);
    }

    // 1. Extract and verify JWT
    const authHeader = request.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return jsonResponse({ error: 'Missing authorization token' }, 401, origin);
    }

    const user = await verifyToken(token, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
    if (!user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401, origin);
    }

    const url = new URL(request.url);
    if (url.pathname === '/send-talk') {
      return handleSendTalk(request, env, origin);
    }

    if (url.pathname === '/' || url.pathname === '/generate-talk') {
      return handleGenerateTalk(request, env, origin, user);
    }

    return jsonResponse({ error: 'Not found' }, 404, origin);
  },
};
