const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const MODEL = 'stepfun/step-3.5-flash:free';

async function callLLM(systemPrompt: string, userPrompt: string): Promise<string> {
  const baseUrl = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': baseUrl,
      'X-Title': 'AI Life Room',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Empty response from LLM');
  return content;
}

// 从 LLM 输出里提取 JSON，兼容带 markdown 代码块的情况
function extractJSON(text: string): any {
  // 直接 parse
  try { return JSON.parse(text.trim()); } catch {}

  // 去掉 ```json ... ``` 包裹
  const fenced = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]); } catch {}
  }

  // 找第一个 { ... } 块
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch {}
  }

  throw new Error(`Could not parse JSON from LLM response:\n${text.slice(0, 300)}`);
}

// ─── Persona 生成 ─────────────────────────────────────────

export async function generatePersona(agentName: string) {
  const system = `You create fictional human personas for AI agents.
Return ONLY valid JSON — no markdown, no explanation, nothing else.`;

  const user = `Create a fictional human persona for an AI agent named "${agentName}".

Rules:
- displayName: realistic name that fits the birth country culture
- birthPlace: a REAL but small/obscure location (village, small town, remote area). NOT London, NYC, Beijing, Tokyo, Paris, or any capital city.
- birthDate: between 1965-01-01 and 2005-12-31
- lifeFramework: 5-8 age bands covering ages 0 to 30, with mundane realistic life events (school, moves, jobs, family). No heroics.

Return this exact JSON structure:
{
  "displayName": "string",
  "birthPlace": {
    "city": "string",
    "country": "string",
    "coordinates": [latitude, longitude],
    "placeDescription": "one sentence describing what kind of place this is"
  },
  "birthDate": "YYYY-MM-DD",
  "lifeFramework": [
    {
      "ageStart": 0,
      "ageEnd": 8,
      "location": "City, Country",
      "keyEvents": ["event 1", "event 2", "event 3"]
    }
  ]
}`;

  const text = await callLLM(system, user);
  return extractJSON(text);
}

// ─── Life Day 生成 ────────────────────────────────────────

export async function generateLifeDay(
  persona: any,
  otherDaysSummary: string,
  existingDates: string[]
) {
  const frameworkText = persona.lifeFramework
    .map((b: any) => `  Age ${b.ageStart}–${b.ageEnd} | ${b.location}: ${b.keyEvents.join(' / ')}`)
    .join('\n');

  const system = `You write life chronicle diary entries for fictional people.
Return ONLY valid JSON — no markdown, no explanation, nothing else.`;

  const user = `Write one life day entry for this person:

Name: ${persona.displayName}
Born: ${new Date(persona.birthDate).getFullYear()} in ${persona.birthPlace.city}, ${persona.birthPlace.country}
(${persona.birthPlace.placeDescription})

Life framework:
${frameworkText}

Dates already written (do NOT repeat these): ${existingDates.length > 0 ? existingDates.join(', ') : 'none yet'}

Other agents currently in the room (use for thoughtBubble inspiration if natural):
${otherDaysSummary || 'None yet — you are the first.'}

Instructions:
- Pick one specific day from the life framework above
- narrative: 2-4 sentences, first person past tense, sensory and specific
- thoughtBubble: 1-2 sentences, present tense inner voice, may quietly reference another agent
- photoSearchQuery: a precise image search query to find a REAL documentary photograph.
  Rules for photoSearchQuery:
  * Include the specific place name (city or region)
  * Include the exact decade or approximate year (e.g. "1990s" or "circa 1988")
  * Include ONE style term: "documentary photograph" OR "photojournalism" OR "street photography" OR "film photography"
  * Add a subject hint: "village life" OR "market" OR "daily life" OR "landscape" OR "people"
  * Do NOT include fictional character names
  * Example: "Tambacounda Senegal 1990s market street photography documentary"
  * Example: "rural Vietnam Ha Giang 1988 village life film photography"
- interactions: empty array unless naturally referencing another agent from the room

Return this exact JSON:
{
  "fictionalDate": "YYYY-MM-DD",
  "fictionalAge": number,
  "location": {
    "city": "string",
    "country": "string",
    "coordinates": [latitude, longitude]
  },
  "narrative": "string",
  "thoughtBubble": "string",
  "photoSearchQuery": "string",
  "interactions": [],
  "isTrajectoryDeviation": false,
  "deviationContext": null
}`;

  const text = await callLLM(system, user);
  return extractJSON(text);
}
