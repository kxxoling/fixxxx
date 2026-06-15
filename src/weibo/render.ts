import type { WeiboStatusInfo } from "./status";
import type { WeiboUserInfo } from "./user";

/**
 * Fetch an image and return as base64 data URL.
 * Caches results within a single render call via the shared cache map.
 */
async function imageToBase64(
  url: string,
  cache: Map<string, string>,
): Promise<string> {
  if (!url) return url;
  if (cache.has(url)) return cache.get(url)!;
  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
        Referer: "https://m.weibo.cn/",
      },
    });
    if (!resp.ok) return url;
    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const buf = await resp.arrayBuffer();
    const b64 = Buffer.from(buf).toString("base64");
    const dataUrl = `data:${contentType};base64,${b64}`;
    cache.set(url, dataUrl);
    return dataUrl;
  } catch {
    return url;
  }
}

/**
 * Upgrade sinaimg.cn URLs to their full-resolution version.
 * Weibo serves cropped/scaled variants via path prefixes like:
 *   crop.0.0.640.640.640/  thumbnail/  square/  bmiddle/  orj480/  orj960/
 *   mw600/  mw690/  mw1024/  thumb150/  thumb180/
 * Replacing with `large/` returns the original uncropped image.
 */
function upgradeSinaImage(url: string): string {
  if (!url) return url;
  return url.replace(
    /^(https?:\/\/[^/]*sinaimg\.cn\/)(?:crop\.\d+(?:\.\d+){4}|thumbnail|square|bmiddle|orj480|orj960|mw600|mw690|mw1024|mw2000|thumb150|thumb180)\/(.+)$/,
    "$1large/$2",
  );
}

/**
 * Replace all sinaimg.cn image URLs in HTML with base64 data URLs.
 */
async function rewriteImageUrls(
  html: string,
  cache: Map<string, string>,
): Promise<string> {
  const urls = new Set<string>();
  const regex = /src=["'](https?:\/\/[^"']*sinaimg\.cn[^"']*?)["']/g;
  let m: RegExpExecArray | null;
  while ((m = regex.exec(html)) !== null) {
    urls.add(m[1]);
  }
  let result = html;
  for (const url of urls) {
    const dataUrl = await imageToBase64(url, cache);
    result = result.split(url).join(dataUrl);
  }
  return result;
}

export async function renderStatusPage(
  status: WeiboStatusInfo,
): Promise<string> {
  const cache = new Map<string, string>();
  const statusUrl = `https://weibo.com/${status.bid ? `detail/${status.bid}` : `detail/${status.id}`}`;
  const plainText = stripHtml(status.textHtml);

  const videoPosterUrl = status.videoPoster
    ? await imageToBase64(status.videoPoster, cache)
    : "";
  const videoHtml = status.videoUrl
    ? `<div class="video-container"><video controls style="width:100%;max-height:450px;border-radius:8px;background:#000;" src="${status.videoUrl}" poster="${videoPosterUrl}"></video></div>`
    : "";

  const imagesHtmlParts: string[] = [];
  for (const img of status.images) {
    const dataUrl = await imageToBase64(img, cache);
    imagesHtmlParts.push(
      `<img src="${dataUrl}" style="max-width: 100%; margin-bottom: 10px; border-radius: 8px;">`,
    );
  }
  const imagesHtml = imagesHtmlParts.join("");

  const playCountHtml = status.playCount ? ` | ${status.playCount}` : "";

  const sourceHtml = status.source
    ? `<span class="source">来自 ${stripHtml(status.source)}</span>`
    : "";

  const avatarUrl = await imageToBase64(status.author.avatar, cache);
  const textHtml = await rewriteImageUrls(status.textHtml, cache);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(plainText.substring(0, 50) || status.videoTitle || "微博")}</title>

  <!-- Open Graph / Telegram -->
  <meta property="og:site_name" content="Weibo Instant View">
  <meta property="og:title" content="${escapeHtml(status.videoTitle || plainText.substring(0, 80) || "微博动态")}">
  <meta property="og:description" content="${escapeHtml(plainText.substring(0, 200))}">
  <meta property="og:url" content="${statusUrl}">
  <meta property="og:type" content="${status.videoUrl ? "video.other" : "article"}">
  ${status.videoUrl ? `<meta property="og:video" content="${status.videoUrl}">` : ""}

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${status.videoUrl ? "player" : "summary_large_image"}">
  <meta name="twitter:title" content="${escapeHtml(status.videoTitle || plainText.substring(0, 80) || "微博动态")}">
  <meta name="twitter:description" content="${escapeHtml(plainText.substring(0, 200))}">

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
    .video-container { margin-bottom: 20px; }
    h1 { font-size: 1.3rem; margin-bottom: 0.5rem; }
    .stats { color: #666; font-size: 0.9rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px; }
    .up-info { display: flex; align-items: center; gap: 5px; font-weight: bold; }
    .up-info img { width: 24px; height: 24px; border-radius: 50%; }
    .content-body { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; line-height: 1.6; }
    .content-body img { max-width: 100%; height: auto; border-radius: 4px; }
    .content-body a { color: #ff8200; }
    .source { color: #999; font-size: 0.85rem; }
  </style>
</head>
<body>
  <h1>${status.videoTitle ? escapeHtml(status.videoTitle) : ""}</h1>
  <div class="stats">
    <div class="up-info">
      <img src="${avatarUrl}" alt="${escapeHtml(status.author.name)}">
      <span>${escapeHtml(status.author.name)}</span>
    </div>
    <span>| 转发: ${status.stat.reposts} | 评论: ${status.stat.comments} | 点赞: ${status.stat.attitudes}${playCountHtml}</span>
  </div>

  <div class="content-body">
    ${textHtml}
    ${videoHtml}
    ${imagesHtml ? `<br>${imagesHtml}` : ""}
  </div>

  ${sourceHtml}

  <br><br>
  <a href="${statusUrl}" style="color: #ff8200;">查看原微博</a>
</body>
</html>`;
}

export async function renderUserPage(user: WeiboUserInfo): Promise<string> {
  const cache = new Map<string, string>();
  const userUrl = `https://weibo.com/u/${user.uid}`;

  const coverDataUrl = user.coverImage
    ? await imageToBase64(upgradeSinaImage(user.coverImage), cache)
    : "";
  const avatarDataUrl = await imageToBase64(
    user.avatarHd || user.avatar,
    cache,
  );

  const renderStatusCard = async (s: {
    coverImage: string | null;
    videoTitle: string | null;
    bid: string | null;
    id: string;
    textHtml: string;
    reposts: number;
    comments: number;
    attitudes: number;
  }) => {
    const coverHtml = s.coverImage
      ? `<img src="${await imageToBase64(s.coverImage, cache)}" style="width: 100%; border-radius: 8px; margin-bottom: 10px; aspect-ratio: 16/9; object-fit: cover;">`
      : "";
    const titleHtml = s.videoTitle
      ? `<div style="font-weight: 600; margin-bottom: 5px;">${escapeHtml(s.videoTitle)}</div>`
      : "";
    const statusLink = s.bid
      ? `https://weibo.com/detail/${s.bid}`
      : `https://weibo.com/detail/${s.id}`;

    return `<div class="status-card">
      <a href="${statusLink}" style="text-decoration: none; color: inherit; display: block;">
        ${coverHtml}
        ${titleHtml}
        <div class="status-text">${truncateHtml(s.textHtml, 100)}</div>
      </a>
      <div class="status-stats">
        <span>转发 ${s.reposts}</span>
        <span>评论 ${s.comments}</span>
        <span>点赞 ${s.attitudes}</span>
      </div>
    </div>`;
  };

  const pinnedCards = await Promise.all(
    user.pinnedStatuses.map(renderStatusCard),
  );
  const pinnedHtml =
    pinnedCards.length > 0
      ? `<div class="section-title">置顶微博</div>${pinnedCards.join("")}`
      : "";

  const recentCards = await Promise.all(
    user.recentStatuses.map(renderStatusCard),
  );
  const recentStatusesHtml =
    recentCards.length > 0
      ? recentCards.join("")
      : '<div style="text-align: center; color: #999; padding: 20px;">暂无微博</div>';

  const coverBg = coverDataUrl
    ? `background-image: url('${coverDataUrl}');`
    : `background: linear-gradient(135deg,#ff8200,#ff5500);`;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(user.name)}的微博主页</title>

  <!-- Open Graph / Telegram -->
  <meta property="og:site_name" content="Weibo Instant View">
  <meta property="og:title" content="${escapeHtml(user.name)}">
  <meta property="og:description" content="${escapeHtml(user.verifiedReason || user.description || user.name)}">
  <meta property="og:image" content="${user.avatarHd || user.avatar}">
  <meta property="og:url" content="${userUrl}">
  <meta property="og:type" content="profile">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(user.name)}">
  <meta name="twitter:description" content="${escapeHtml(user.verifiedReason || user.description || user.name)}">
  <meta name="twitter:image" content="${user.avatarHd || user.avatar}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; background: #f4f4f4; }
    .user-card { position: relative; margin: 20px; border-radius: 16px; overflow: hidden; background: #fff; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
    .user-card .cover { position: absolute; left: 0; top: 0; width: 100%; height: 100%; background-size: cover; background-position: center; background-repeat: no-repeat; }
    .user-card .profile-body { position: relative; padding: 200px 20px 25px; text-align: center; }
    .user-card .profile-panel { background: rgba(255,255,255,0.7); backdrop-filter: blur(2px); -webkit-backdrop-filter: blur(2px); border-radius: 12px; padding: 20px 16px 22px; }
    .user-card .avatar { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; border: 4px solid #fff; box-shadow: 0 2px 12px rgba(0,0,0,0.15); margin-top: -50px; position: relative; }
    .user-card h1 { font-size: 1.4rem; margin: 10px 0 5px; }
    .user-card .verified { color: #ff8200; font-size: 0.85rem; margin-bottom: 8px; }
    .user-card .desc { color: #666; font-size: 0.95rem; margin-bottom: 15px; }
    .profile-stats { display: flex; justify-content: center; gap: 30px; padding-top: 15px; border-top: 1px solid #eee; }
    .profile-stats .stat-num { font-size: 1.1rem; font-weight: bold; padding: 8px 16px; }
    .profile-stats .stat-label { font-size: 0.8rem; color: #999; }
    .section-title { font-size: 1.1rem; font-weight: bold; padding: 20px 20px 10px; color: #333; }
    .status-card { background: #fff; border-radius: 8px; padding: 15px; margin: 0 20px 10px; }
    .status-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
    .status-card .status-text { color: #333; font-size: 0.9rem; line-height: 1.5; margin-bottom: 8px; }
    .status-card .status-text a { color: #ff8200; }
    .status-card .status-stats { display: flex; gap: 15px; color: #999; font-size: 0.8rem; }
    .footer { text-align: center; padding: 20px; }
    .footer a { color: #ff8200; }
  </style>
</head>
<body>
  <div class="user-card">
    <div class="cover" style="${coverBg}"></div>
    <div class="profile-body">
      <div class="profile-panel">
        <img class="avatar" src="${avatarDataUrl}" alt="${escapeHtml(user.name)}">
        <h1>${escapeHtml(user.name)}</h1>
        ${user.verified && user.verifiedReason ? `<div class="verified">V ${escapeHtml(user.verifiedReason)}</div>` : ""}
        ${user.description ? `<div class="desc">${escapeHtml(user.description)}</div>` : ""}
        <div class="profile-stats">
          <div class="stat-item">
            <div class="stat-num">${escapeHtml(user.followersCount)}</div>
            <div class="stat-label">粉丝</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${user.followCount}</div>
            <div class="stat-label">关注</div>
          </div>
          <div class="stat-item">
            <div class="stat-num">${user.statusesCount}</div>
            <div class="stat-label">微博</div>
          </div>
        </div>
      </div>
    </div>
  </div>

  ${pinnedHtml}

  <div class="section-title">近期微博</div>
  ${recentStatusesHtml}

  <div class="footer">
    <a href="${userUrl}">在微博查看完整主页</a>
  </div>
</body>
</html>`;
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function truncateHtml(html: string, maxLen: number): string {
  const text = stripHtml(html);
  if (text.length <= maxLen) return escapeHtml(text);
  return escapeHtml(text.substring(0, maxLen)) + "...";
}
