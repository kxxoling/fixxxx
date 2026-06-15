import { safeJson } from "../bilibili/utils";
import { WeiboApiError } from "./errors";
import { getHeaders } from "./headers";

export interface WeiboRecentStatus {
  id: string;
  textHtml: string;
  createdAt: string;
  bid: string | null;
  reposts: number;
  comments: number;
  attitudes: number;
  coverImage: string | null;
  videoTitle: string | null;
}

export interface WeiboUserInfo {
  uid: string;
  name: string;
  description: string;
  avatar: string;
  avatarHd: string;
  profileUrl: string;
  followersCount: string;
  followCount: number;
  statusesCount: number;
  gender: "m" | "f" | "n";
  verified: boolean;
  verifiedReason: string | null;
  coverImage: string | null;
  pinnedStatuses: WeiboRecentStatus[];
  recentStatuses: WeiboRecentStatus[];
}

function parseRecentStatus(mblog: any): WeiboRecentStatus {
  const pageInfo = mblog.page_info;
  return {
    id: mblog.id?.toString() || "",
    textHtml: mblog.text || "",
    createdAt: mblog.created_at || "",
    bid: mblog.bid || null,
    reposts: mblog.reposts_count || 0,
    comments: mblog.comments_count || 0,
    attitudes: mblog.attitudes_count || 0,
    coverImage: pageInfo?.page_pic?.url || null,
    videoTitle: pageInfo?.title || null,
  };
}

export interface WeiboAlbumItem {
  picSmall: string;
  picBig: string;
  pid: string;
  bid: string | null;
}

export interface WeiboAlbumInfo {
  user: {
    uid: string;
    name: string;
    avatar: string;
    avatarHd: string;
  };
  items: WeiboAlbumItem[];
}

export async function getAlbumInfo(
  uid: string,
): Promise<WeiboAlbumInfo | null> {
  try {
    // Fetch user profile for header info
    const profileUrl = `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}`;
    const profileResp = await fetch(profileUrl, {
      headers: await getHeaders(),
    });

    let user = { uid, name: "", avatar: "", avatarHd: "" };
    if (profileResp.ok) {
      const profileData = (await safeJson(profileResp)) as any;
      if (profileData.ok === 1 && profileData.data?.userInfo) {
        const u = profileData.data.userInfo;
        user = {
          uid: u.id?.toString() || uid,
          name: u.screen_name || "",
          avatar: u.profile_image_url || "",
          avatarHd: u.avatar_hd || u.profile_image_url || "",
        };
      }
    }

    // Fetch album container (107803 + uid)
    const albumUrl = `https://m.weibo.cn/api/container/getIndex?containerid=107803${uid}&page=1`;
    const albumResp = await fetch(albumUrl, {
      headers: await getHeaders(),
    });

    if (!albumResp.ok) return { user, items: [] };

    const albumData = (await safeJson(albumResp)) as any;
    if (albumData.ok !== 1) return { user, items: [] };

    const items: WeiboAlbumItem[] = [];
    const cards = albumData.data?.cards || [];
    for (const card of cards) {
      if (card.card_type === 11 && card.card_group) {
        for (const g of card.card_group) {
          if (g.card_type === 47 && g.pics) {
            for (const pic of g.pics) {
              items.push({
                picSmall: pic.pic_middle || pic.pic_small || "",
                picBig: pic.pic_big || pic.pic_mw2000 || pic.pic_middle || "",
                pid: pic.pic_id || "",
                bid: g.mblog?.bid || null,
              });
            }
          }
        }
      }
    }

    return { user, items };
  } catch (error) {
    if (error instanceof WeiboApiError) throw error;
    console.error("Fetch Error (Weibo Album):", error);
    throw error;
  }
}

export async function getUserInfo(uid: string): Promise<WeiboUserInfo | null> {
  try {
    // Step 1: Get user profile
    const profileUrl = `https://m.weibo.cn/api/container/getIndex?type=uid&value=${uid}`;
    const response = await fetch(profileUrl, {
      headers: await getHeaders(),
    });

    if (!response.ok) {
      throw new WeiboApiError(
        `HTTP Error: ${response.status}`,
        response.status,
      );
    }

    const data = (await safeJson(response)) as any;

    if (data.ok !== 1 || !data.data?.userInfo) {
      if (data.ok !== 1) {
        throw new WeiboApiError(data.msg || "Weibo API Error", data.ok, data);
      }
      return null;
    }

    const u = data.data.userInfo;

    // Step 2: Get feed containerid from tabsInfo
    const feedTab = data.data?.tabsInfo?.tabs?.find(
      (t: any) => t.tabKey === "weibo",
    );
    const feedContainerId = feedTab?.containerid || `107603${uid}`;

    // Step 3: Fetch statuses (pinned + recent)
    let pinnedStatuses: WeiboRecentStatus[] = [];
    let recentStatuses: WeiboRecentStatus[] = [];
    try {
      const feedUrl = `https://m.weibo.cn/api/container/getIndex?containerid=${feedContainerId}&page=1`;
      const feedResp = await fetch(feedUrl, {
        headers: await getHeaders(),
      });

      if (feedResp.ok) {
        const feedData = (await safeJson(feedResp)) as any;
        if (feedData.ok === 1 && feedData.data?.cards) {
          const mblogs: { isPinned: boolean; status: WeiboRecentStatus }[] =
            feedData.data.cards
              .filter((card: any) => card.card_type === 9 && card.mblog)
              .map((card: any) => ({
                isPinned: card.mblog?.title?.text === "置顶",
                status: parseRecentStatus(card.mblog),
              }));
          pinnedStatuses = mblogs
            .filter((m: { isPinned: boolean }) => m.isPinned)
            .map((m: { status: WeiboRecentStatus }) => m.status)
            .slice(0, 2);
          recentStatuses = mblogs
            .filter((m: { isPinned: boolean }) => !m.isPinned)
            .map((m: { status: WeiboRecentStatus }) => m.status)
            .slice(0, 3);
        }
      }
    } catch (e) {
      console.error("Failed to fetch recent statuses:", e);
    }

    return {
      uid: u.id?.toString() || uid,
      name: u.screen_name || "",
      description: u.description || "",
      avatar: u.profile_image_url || "",
      avatarHd: u.avatar_hd || u.profile_image_url || "",
      profileUrl: u.profile_url || `https://m.weibo.cn/u/${uid}`,
      followersCount: u.followers_count || u.followers_count_str || "0",
      followCount: u.follow_count || 0,
      statusesCount: u.statuses_count || 0,
      gender: u.gender === "m" ? "m" : u.gender === "f" ? "f" : "n",
      verified: u.verified || false,
      verifiedReason: u.verified_reason || null,
      coverImage: u.cover_image_phone || null,
      pinnedStatuses,
      recentStatuses,
    };
  } catch (error) {
    if (error instanceof WeiboApiError) {
      throw error;
    }
    console.error("Fetch Error (Weibo User):", error);
    throw error;
  }
}
