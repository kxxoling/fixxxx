import { safeJson } from "../bilibili/utils";
import { WeiboApiError } from "./errors";
import { getHeaders } from "./headers";

export interface WeiboStatusInfo {
  id: string;
  textHtml: string;
  images: string[];
  videoUrl: string | null;
  videoTitle: string | null;
  videoPoster: string | null;
  playCount: string | null;
  author: {
    name: string;
    avatar: string;
    profileUrl: string;
  };
  stat: {
    reposts: number;
    comments: number;
    attitudes: number;
  };
  created_at: string;
  bid: string | null;
  source: string | null;
  isLongText: boolean;
  longTextContent: string | null;
}

function parseMblog(mblog: any): WeiboStatusInfo {
  const pageInfo = mblog.page_info;
  const videoUrl =
    pageInfo?.media_info?.stream_url_hd ||
    pageInfo?.media_info?.stream_url ||
    pageInfo?.urls?.mp4_720p_mp4 ||
    pageInfo?.urls?.mp4_hd_mp4 ||
    null;

  const images: string[] = [];
  if (mblog.pic_ids && Array.isArray(mblog.pic_ids)) {
    // pic_ids are IDs; we need pic_infos for URLs
    if (mblog.pic_infos) {
      for (const picId of mblog.pic_ids) {
        const pic = mblog.pic_infos[picId];
        if (pic?.url) images.push(pic.url);
      }
    }
  }
  // Also check pics array
  if (mblog.pics && Array.isArray(mblog.pics)) {
    for (const pic of mblog.pics) {
      if (pic?.large?.url) images.push(pic.large.url);
      else if (pic?.url) images.push(pic.url);
    }
  }

  return {
    id: mblog.id?.toString() || mblog.mid?.toString() || "",
    textHtml: mblog.text || "",
    images,
    videoUrl,
    videoTitle: pageInfo?.title || null,
    videoPoster: pageInfo?.page_pic?.url || null,
    playCount: pageInfo?.play_count || null,
    author: {
      name: mblog.user?.screen_name || "",
      avatar: mblog.user?.profile_image_url || "",
      profileUrl: mblog.user?.profile_url || "",
    },
    stat: {
      reposts: mblog.reposts_count || 0,
      comments: mblog.comments_count || 0,
      attitudes: mblog.attitudes_count || 0,
    },
    created_at: mblog.created_at || "",
    bid: mblog.bid || null,
    source: mblog.source || null,
    isLongText: mblog.isLongText || false,
    longTextContent: null,
  };
}

export async function getStatusInfo(
  id: string,
): Promise<WeiboStatusInfo | null> {
  try {
    // Use statuses/show which returns full mblog data including page_info (video/images)
    const url = `https://m.weibo.cn/statuses/show?id=${id}`;
    const response = await fetch(url, {
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new WeiboApiError(
        `HTTP Error: ${response.status}`,
        response.status,
      );
    }

    const data = (await safeJson(response)) as any;

    if (data.ok === 1 && data.data) {
      const mblog = data.data;
      const info = parseMblog(mblog);

      // Fetch long text if needed
      if (info.isLongText && !info.longTextContent) {
        try {
          const extendUrl = `https://m.weibo.cn/statuses/extend?id=${id}`;
          const extendResp = await fetch(extendUrl, {
            headers: await getHeaders(),
          });
          if (extendResp.ok) {
            const extendData = (await safeJson(extendResp)) as any;
            if (extendData.ok === 1 && extendData.data?.longTextContent) {
              info.textHtml = extendData.data.longTextContent;
              info.longTextContent = extendData.data.longTextContent;
            }
          }
        } catch {
          // Ignore long text fetch errors
        }
      }

      return info;
    }

    if (data.ok !== 1) {
      throw new WeiboApiError(data.msg || "Weibo API Error", data.ok, data);
    }

    return null;
  } catch (error) {
    if (error instanceof WeiboApiError) {
      throw error;
    }
    console.error("Fetch Error (Weibo Status):", error);
    throw error;
  }
}
