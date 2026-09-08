import { buildVideoPath, zhihuApiGet } from "./api";

export interface ZhihuVideo {
  /** 预签名 mp4 直链（有时效，过期后只剩封面图和原文链接兜底）。 */
  url: string;
  /** zhimg.com 上的封面图地址。 */
  poster: string;
}

/**
 * 收集回答里引用的知乎视频 id。视频会以 data-video-id 属性、
 * zhihu.com/video/{id} 链接或 attachment 对象的形式出现，
 * 取决于回答 RichText 的版本。
 */
export function extractVideoIds(...sources: (string | undefined)[]): string[] {
  const ids = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const m of source.matchAll(/data-video-id="([^"]+)"/g)) {
      if (m[1]) ids.add(m[1]);
    }
    for (const m of source.matchAll(/zhihu\.com\/video\/(\d+)/g)) {
      if (m[1]) ids.add(m[1]);
    }
  }
  return [...ids];
}

/**
 * 从 /api/v4/videos 响应里挑最佳可播放流：
 * 选 height 最大的 mp4，没有则退回任意可用条目。
 */
export function pickVideoStream(data: any): ZhihuVideo | null {
  const playlist = Array.isArray(data?.playlist) ? data.playlist : [];
  const playable = playlist.filter(
    (p: any) => p?.play_url && (!p.format || p.format === "mp4"),
  );
  const best = playable.sort(
    (a: any, b: any) => (b.height || 0) - (a.height || 0),
  )[0];
  if (!best) return null;
  const poster = data?.thumbnail || data?.cover_url || "";
  return { url: best.play_url, poster };
}

/**
 * 通过签名后的 videos 接口把视频 id 解析成可播放的 mp4。
 * 失败时返回 null，调用方降级为占位提示。
 */
export async function resolveZhihuVideo(
  videoId: string,
): Promise<ZhihuVideo | null> {
  try {
    const data = await zhihuApiGet(buildVideoPath(videoId));
    if (!data) return null;
    return pickVideoStream(data);
  } catch (e) {
    console.error(`知乎视频 ${videoId} 解析失败:`, e);
    return null;
  }
}

export async function resolveVideos(
  videoIds: string[],
): Promise<Record<string, ZhihuVideo>> {
  const resolved = await Promise.all(
    videoIds.map(async (id) => [id, await resolveZhihuVideo(id)] as const),
  );
  const map: Record<string, ZhihuVideo> = {};
  for (const [id, video] of resolved) {
    if (video) map[id] = video;
  }
  return map;
}
