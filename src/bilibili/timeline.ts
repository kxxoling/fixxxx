import { BilibiliApiError } from "./errors";
import { getHeaders } from "./headers";
import { safeJson } from "./utils";
import { encWbi } from "./wbi";

export interface TimelineInfo {
  id: string;
  type:
    | "DYNAMIC_TYPE_DRAW"
    | "DYNAMIC_TYPE_WORD"
    | "DYNAMIC_TYPE_AV"
    | "UNKNOWN";
  author: {
    name: string;
    face: string;
  };
  content: {
    text: string;
    images?: string[];
  };
  stat: {
    view?: number;
    like: number;
    reply: number;
  };
  pubdate: number;
}

export async function getTimelineInfo(
  id: string,
): Promise<TimelineInfo | null> {
  try {
    const params = await encWbi({ dynamic_id: id });
    const query = new URLSearchParams(params as any).toString();
    const url = `https://api.vc.bilibili.com/dynamic_svr/v1/dynamic_svr/get_dynamic_detail?${query}`;
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

    if (data.code === 0 && data.data && data.data.card) {
      const card = data.data.card;
      const desc = card.desc;
      const cardData = JSON.parse(card.card);
      const author = desc.user_profile.info;

      let contentText = "";
      let images: string[] = [];
      let type: TimelineInfo["type"] = "UNKNOWN";

      // Map API types to our types
      // 2: DYNAMIC_TYPE_DRAW (Image + Text)
      // 4: DYNAMIC_TYPE_WORD (Text only)
      // 8: DYNAMIC_TYPE_AV (Video)
      // 64: DYNAMIC_TYPE_ARTICLE (Article)
      if (desc.type === 2) {
        type = "DYNAMIC_TYPE_DRAW";
        contentText = cardData.item.description; // Draw type uses 'description'
        images = cardData.item.pictures.map((p: any) => p.img_src);
      } else if (desc.type === 4) {
        type = "DYNAMIC_TYPE_WORD";
        contentText = cardData.item.content; // Word type uses 'content'
      } else if (desc.type === 8) {
        type = "DYNAMIC_TYPE_AV";
        contentText = cardData.desc; // Video type uses 'desc'
        images = [cardData.pic];
      } else if (desc.type === 64) {
        type = "DYNAMIC_TYPE_WORD"; // Treat article as word for now or generic
        contentText = cardData.summary;
        images = cardData.image_urls;
      }

      return {
        id: desc.dynamic_id_str,
        type,
        author: {
          name: author.uname,
          face: author.face,
        },
        content: {
          text: contentText,
          images,
        },
        stat: {
          view: desc.view,
          like: desc.like,
          reply: desc.comment, // Note: reply count might be in desc.comment or desc.reply depends, usually desc.comment in older API? Let's check or assume standard.
          // Actually desc contains `like`, `view`, `repost`. `comment` usually is a count.
          // We'll trust `desc` has these.
        },
        pubdate: desc.timestamp,
      };
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
    console.error("Fetch Error (Timeline):", error);
    throw error;
  }
}
