import { BilibiliApiError } from "./errors";
import { getHeaders } from "./headers";
import { safeJson } from "./utils";
import { encWbi } from "./wbi";

export interface OpusInfo {
  id: string;
  title: string;
  banner_url: string;
  summary: string;
  content: any[]; // Structured content (paragraphs)
  author: {
    name: string;
    face: string;
  };
  stat: {
    like: number;
    reply: number;
    coin: number;
  };
  pubdate: number;
}

export async function getOpusInfo(id: string): Promise<OpusInfo | null> {
  try {
    // Use the official Opus detail API with parameters from bilibili-api
    // https://github.com/Nemo2011/bilibili-api/blob/master/bilibili_api/data/api/opus.json
    const params = await encWbi({
      id: id,
      timezone_offset: "-480",
      features:
        "onlyfansVote,onlyfansAssetsV2,decorationCard,htmlNewStyle,ugcDelete,editable,opusPrivateVisible",
    });
    const query = new URLSearchParams(params as any).toString();
    const url = `https://api.bilibili.com/x/polymer/web-dynamic/v1/opus/detail?${query}`;

    const headers = await getHeaders();
    const response = await fetch(url, {
      headers: {
        ...headers,
        Cookie: headers.Cookie, // Already includes buvid3
      },
    });

    if (!response.ok) {
      throw new BilibiliApiError(
        `HTTP Error: ${response.status}`,
        response.status,
      );
    }

    const data = (await safeJson(response)) as any;

    if (data.code === 0 && data.data && data.data.item) {
      return parseOpusResponse(data.data.item);
    }
    throw new BilibiliApiError(
      data.message || "Bilibili API Error",
      data.code,
      data,
    );
  } catch (error) {
    if (error instanceof BilibiliApiError) {
      throw error;
    }
    console.error("Fetch Error (Opus):", error);
    throw error;
  }
}

export function parseOpusResponse(item: any): OpusInfo {
  const modules: any[] = item.modules || [];
  let title = "";
  let authorName = "";
  let authorFace = "";
  let pubdate = 0;
  let content: any[] = [];
  const stat = { like: 0, reply: 0, coin: 0 };
  const banner_url = "";
  const summary = "";

  for (const mod of modules) {
    if (mod.module_type === "MODULE_TYPE_TITLE") {
      title = mod.module_title?.text || "";
    } else if (mod.module_type === "MODULE_TYPE_AUTHOR") {
      authorName = mod.module_author?.name || "";
      authorFace = mod.module_author?.face || "";
      pubdate = mod.module_author?.pub_ts || 0;
    } else if (mod.module_type === "MODULE_TYPE_CONTENT") {
      content = mod.module_content?.paragraphs || [];
    } else if (mod.module_type === "MODULE_TYPE_STAT") {
      stat.like = mod.module_stat?.like?.count || 0;
      stat.reply = mod.module_stat?.comment?.count || 0;
      stat.coin = mod.module_stat?.coin?.count || 0;
    }
  }

  return {
    id: item.id_str,
    title,
    banner_url,
    summary,
    content,
    author: {
      name: authorName,
      face: authorFace,
    },
    stat,
    pubdate,
  };
}
