interface Env {
  OPENAI_API_KEY: string;
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  CORS_ORIGIN: string;
  DAILY_LIMIT: string;
}

interface SupabaseUser {
  id: string;
  email: string;
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

/** Verify a Supabase JWT by calling the auth endpoint. */
async function verifyToken(token: string, supabaseUrl: string): Promise<SupabaseUser | null> {
  const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: token, // Supabase also accepts the JWT as apikey for user endpoints
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

    const user = await verifyToken(token, env.SUPABASE_URL);
    if (!user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401, origin);
    }

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

    // 4. Call OpenAI
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are FieldTalk Formatter. Convert a short task description into a structured toolbox talk.

Return ONLY compact JSON with these exact keys:
{"i":"","hazards":[],"practices":[],"ppe":[],"sif":[],"manual":[],"q":[]}

Rules:
- i = 1–2 sentences (intro).
- hazards/practices/ppe/sif/manual/q = arrays, max 4 items each.
- Each item ≤ 12 words, action-oriented.
- No citations, no extra keys, no markdown, no explanations.`,
          },
          {
            role: 'user',
            content: `The task is ${workDescription}`,
          },
        ],
        max_tokens: 800,
        temperature: 0.7,
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

    const openaiData = (await openaiRes.json()) as {
      choices?: { message?: { content?: string } }[];
      usage?: { total_tokens?: number };
    };
    const content = openaiData.choices?.[0]?.message?.content || '';
    const tokensUsed = openaiData.usage?.total_tokens || 0;

    // 5. Record usage
    await recordUsage(user.id, tokensUsed, env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

    // 6. Return result
    return jsonResponse(
      { content, usage: { used: used + 1, limit: dailyLimit } },
      200,
      origin
    );
  },
};
