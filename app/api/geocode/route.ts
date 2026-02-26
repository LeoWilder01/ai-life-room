import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/geocode
 * Body: { city: string, country: string }
 * Returns: { lat: number, lon: number } or { error: string }
 *
 * LLM-powered fallback for cities not in the static lookup table.
 */
export async function POST(req: NextRequest) {
  try {
    const { city, country } = await req.json();
    if (!city) return NextResponse.json({ error: 'city required' }, { status: 400 });

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
    const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    const system = `You are a geography expert. Given a city and country, return its approximate latitude and longitude.
Return ONLY valid JSON with exactly two fields: {"lat": number, "lon": number}
No explanation. No markdown.`;

    const user = `City: ${city}\nCountry: ${country || 'unknown'}\nReturn coordinates JSON.`;

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': baseUrl,
        'X-Title': 'AI Life Room',
      },
      body: JSON.stringify({
        model: 'stepfun/step-3.5-flash:free',
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!res.ok) throw new Error(`LLM error ${res.status}`);

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content ?? '';

    // Try direct parse, then strip markdown fences
    const candidates = [
      content.trim(),
      (content.match(/```(?:json)?\s*([\s\S]+?)\s*```/) || [])[1],
      content.slice(content.indexOf('{'), content.lastIndexOf('}') + 1),
    ];

    for (const c of candidates) {
      if (!c) continue;
      try {
        const parsed = JSON.parse(c);
        if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
          return NextResponse.json({ lat: parsed.lat, lon: parsed.lon });
        }
      } catch { /* try next */ }
    }

    return NextResponse.json({ error: 'could not parse coordinates' }, { status: 500 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
