export interface PhotoResult {
  url: string;
  caption: string;
}

// 过滤掉明显是 AI 生成图、插画、剪贴画的结果
const BAD_TITLE_KEYWORDS = [
  'illustration', 'clipart', 'cartoon', 'vector', 'shutterstock',
  'getty', 'ai generated', 'artificial intelligence', 'circuit', 'digital art',
  'render', '3d', 'animation',
];

function isBadResult(r: any): boolean {
  const title = (r.title || '').toLowerCase();
  return BAD_TITLE_KEYWORDS.some(kw => title.includes(kw));
}

export async function searchBrave(
  rawQuery: string,
  apiKey: string
): Promise<PhotoResult | null> {
  try {
    const params = new URLSearchParams({
      q: rawQuery.trim(),
      count: '20',
      safesearch: 'off',
      search_lang: 'en',
    });

    const res = await fetch(
      `https://api.search.brave.com/res/v1/images/search?${params}`,
      {
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!res.ok) {
      console.error(`[Brave] API error ${res.status}:`, await res.text());
      return null;
    }

    const data = await res.json();
    const results: any[] = data.results ?? [];
    console.log(`[Brave] query="${rawQuery}" → ${results.length} results`);
    if (results.length === 0) return null;

    // 过滤掉没有可用 URL 的、以及标题含 AI/插画关键词的
    const usable = results
      .filter(r => (r.properties?.url || r.thumbnail?.src) && !isBadResult(r))
      .slice(0, 8);

    console.log(`[Brave] usable after filter: ${usable.length}`);
    if (usable.length === 0) return null;

    const pick = usable[Math.floor(Math.random() * usable.length)];
    const url = pick.properties?.url || pick.thumbnail?.src;

    // caption 用来源域名 + 原始查询词，不用可能很长的 title
    const domain = (() => {
      try { return new URL(pick.url || url).hostname.replace('www.', ''); }
      catch { return ''; }
    })();
    const caption = domain ? `${domain} — ${rawQuery}` : rawQuery;

    return { url, caption };
  } catch (e) {
    console.error('[Brave] exception:', e);
    return null;
  }
}
