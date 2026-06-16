import { BangumiApiError } from "./errors";

export interface BangumiSubjectInfo {
  id: number;
  name: string;
  nameCn: string;
  summary: string;
  cover: string;
  date: string;
  platform: string;
  type: number;
  totalEpisodes: number;
  rating: {
    rank: number;
    score: number;
    total: number;
    count: Record<string, number>;
  };
  collection: {
    wish: number;
    collect: number;
    doing: number;
    onHold: number;
    dropped: number;
  };
  tags: { name: string; count: number }[];
  infobox: { key: string; value: string | { k: string; v: string }[] }[];
  url: string;
}

const TYPE_NAMES: Record<number, string> = {
  1: "书籍",
  2: "动画",
  3: "游戏",
  4: "音乐",
  6: "三次元",
};

export async function getSubjectInfo(
  id: string,
): Promise<BangumiSubjectInfo | null> {
  try {
    const url = `https://api.bgm.tv/v0/subjects/${id}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "fixxxx/1.0 (https://github.com/example/fixxxx)",
      },
    });

    if (response.status === 404) return null;

    if (!response.ok) {
      const body = await response.text();
      throw new BangumiApiError(
        `HTTP Error: ${response.status} - ${body}`,
        response.status,
      );
    }

    const data = (await response.json()) as any;

    return {
      id: data.id,
      name: data.name || "",
      nameCn: data.name_cn || "",
      summary: data.summary || "",
      cover:
        data.images?.large || data.images?.common || data.images?.medium || "",
      date: data.date || "",
      platform: data.platform || "",
      type: data.type || 0,
      totalEpisodes: data.total_episodes || data.eps || 0,
      rating: {
        rank: data.rating?.rank || 0,
        score: data.rating?.score || 0,
        total: data.rating?.total || 0,
        count: data.rating?.count || {},
      },
      collection: {
        wish: data.collection?.wish || 0,
        collect: data.collection?.collect || 0,
        doing: data.collection?.doing || 0,
        onHold: data.collection?.on_hold || 0,
        dropped: data.collection?.dropped || 0,
      },
      tags: (data.tags || []).slice(0, 10),
      infobox: data.infobox || [],
      url: `https://bgm.tv/subject/${data.id}`,
    };
  } catch (error) {
    if (error instanceof BangumiApiError) throw error;
    console.error("Fetch Error (Bangumi Subject):", error);
    throw error;
  }
}

export { TYPE_NAMES };
