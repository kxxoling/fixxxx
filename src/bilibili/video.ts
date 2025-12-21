import { BilibiliApiError } from "./errors";
import { getHeaders } from "./headers";
import { safeJson } from "./utils";
import { encWbi } from "./wbi";

export interface VideoInfo {
  bvid: string;
  aid: number;
  title: string;
  desc: string;
  pic: string;
  owner: {
    name: string;
    face: string;
  };
  stat: {
    view: number;
    danmaku: number;
    reply: number;
  };
  pubdate: number;
  pages: {
    cid: number;
    page: number;
    part: string;
    duration: number;
  }[];
}

export interface Comment {
  rpid: number;
  member: {
    uname: string;
    avatar: string;
  };
  content: {
    message: string;
  };
  like: number;
  ctime: number;
  replies?: Comment[];
}

export async function getVideoInfo(bvid: string): Promise<VideoInfo | null> {
  try {
    const params = await encWbi({ bvid });
    const query = new URLSearchParams(params as any).toString();
    const url = `https://api.bilibili.com/x/web-interface/view?${query}`;
    const response = await fetch(url, {
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new BilibiliApiError(
        `HTTP Error: ${response.status}`,
        response.status,
      );
    }

    const data = (await safeJson(response)) as any;
    if (data.code === 0) {
      return data.data as VideoInfo;
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
    console.error("Fetch Error (Video):", error);
    throw error;
  }
}

export async function getComments(aid: number): Promise<Comment[]> {
  try {
    // sort=1 (hot), type=1 (video)
    const url = `https://api.bilibili.com/x/v2/reply?type=1&oid=${aid}&sort=1`;
    const response = await fetch(url, {
      headers: await getHeaders(),
    });

    const data = (await safeJson(response)) as any;
    if (data.code === 0 && data.data.replies) {
      return data.data.replies as Comment[];
    }
    return [];
  } catch (error) {
    console.error("Fetch Error (Comments):", error);
    return [];
  }
}
