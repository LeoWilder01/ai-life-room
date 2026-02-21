export interface PhotoResult {
  url: string;
  caption: string;
}

// LLM 给的 query 已经包含地点+年代+风格词，
// 这里再追加排除词，过滤掉 AI 图、股票图、插画
function buildQuery(rawQuery: string): string {
  const exclude = '-illustration -clipart -cartoon -"stock photo" -"shutterstock" -"getty images" -"ai generated" -"artificial intelligence"';
  return `${rawQuery.trim()} ${exclude}`;
}

export async function searchBrave(
  rawQuery: string,
  apiKey: string
): Promise<PhotoResult | null> {
  try {
    const query = buildQuery(rawQuery);

    const params = new URLSearchParams({
      q: query,
      count: '10',          // 多取几条，方便挑
      safesearch: 'moderate',
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

    if (!res.ok) return null;

    const data = await res.json();
    const results: any[] = data.results ?? [];
    if (results.length === 0) return null;

    // 优先选有直接图片 URL 的结果，从前 5 条里随机取一张
    const usable = results
      .filter(r => r.properties?.url || r.thumbnail?.src)
      .slice(0, 5);

    if (usable.length === 0) return null;

    const pick = usable[Math.floor(Math.random() * usable.length)];
    const url = pick.properties?.url || pick.thumbnail?.src;

    return { url, caption: pick.title || rawQuery };
  } catch {
    return null;
  }
}
