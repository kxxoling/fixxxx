import { escapeHtml, proxied } from "./utils";
import type { ZhihuVideo } from "./video";

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "b",
  "strong",
  "i",
  "em",
  "u",
  "s",
  "a",
  "img",
  "video",
  "ul",
  "ol",
  "li",
  "blockquote",
  "pre",
  "code",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "figure",
  "figcaption",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
]);

const VIDEO_NOTE = `<p>（原文包含视频，请到知乎查看）</p>`;

function tagAttr(tag: string, name: string): string {
  const m = tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`));
  return (m?.[1] || m?.[2] || "").trim();
}

/**
 * 重写单个 <img> 标签：知乎把懒加载占位图（svg data URL）放在 src 里，
 * 真实图片藏在 data-actualsrc / data-original。所有图片统一走本地代理，
 * 绕过图床防盗链。
 */
function rewriteImgTag(tag: string): string {
  const attr = (name: string): string => {
    const m = tag.match(new RegExp(`${name}=(?:"([^"]*)"|'([^']*)')`));
    return (m?.[1] || m?.[2] || "").trim();
  };
  const srcset = attr("data-actualsrcset") || attr("data-originalsrcset");
  let src =
    attr("data-original") ||
    attr("data-actualsrc") ||
    (srcset ? srcset.split(" ")[0] : "") ||
    attr("src");
  if (!src || src.startsWith("data:")) return "";
  if (src.startsWith("//")) src = `https:${src}`;
  const alt = attr("alt");
  return `<img src="${proxied(src)}" alt="${escapeHtml(alt)}" loading="lazy">`;
}

/** 已解析（或直接外链）的 mp4 流的内嵌播放器。 */
export function videoPlayer(
  src: string,
  poster: string,
  videoId?: string,
): string {
  const posterAttr = poster ? ` poster="${proxied(poster)}"` : "";
  const vidAttr = videoId ? ` data-vid="${escapeHtml(videoId)}"` : "";
  return `<video controls preload="metadata" src="${escapeHtml(src)}"${posterAttr}${vidAttr}></video>`;
}

/**
 * 重建一个 <video> 元素：优先用已解析的视频 id，其次用 CDN 直链 mp4；
 * 其他情况（懒加载占位、失效链接）降级为占位提示。
 */
function rebuildVideoTag(
  tag: string,
  videos: Record<string, ZhihuVideo>,
): string {
  const videoId = tagAttr(tag, "data-video-id");
  const resolved = videoId ? videos[videoId] : undefined;
  if (resolved) return videoPlayer(resolved.url, resolved.poster, videoId);

  const src = tagAttr(tag, "src");
  if (src && /^https?:\/\//.test(src) && !/zhihu\.com\/video\//.test(src)) {
    return videoPlayer(src, tagAttr(tag, "poster"));
  }
  return VIDEO_NOTE;
}

/**
 * 尽力而为的知乎 RichText HTML 清洗：去掉 script/style/iframe 和
 * 白名单之外的标签（保留其文字），除链接的 href 外剥离所有属性，
 * 还原懒加载图片。已解析出直链的视频会变成内嵌 <video controls> 播放器。
 */
export function sanitizeContentHtml(
  html: string,
  videos: Record<string, ZhihuVideo> = {},
): string {
  if (!html) return "";

  let out = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, "")
    .replace(/<\/?(script|style|noscript|svg|object|embed)[^>]*>/gi, "");

  // iframe 降级为普通链接（Telegram IV 反正跑不了它们）
  out = out.replace(
    /<iframe[^>]*\ssrc=(?:"([^"]*)"|'([^']*)')[^>]*>[\s\S]*?<\/iframe>/gi,
    (_m, h1, h2) => {
      const href = h1 || h2;
      return href
        ? `<p><a href="${escapeHtml(href)}">查看嵌入内容</a></p>`
        : "";
    },
  );
  out = out.replace(/<iframe[^>]*>/gi, "");

  // 先剥掉 RichText 里可能存在的孤立 </video>，
  // 必须在生成播放器之前做，否则会把播放器自己的闭合标签吃掉
  out = out.replace(/<\/video>/gi, "");
  // 视频：整个元素替换，解析出直链时换成播放器（无配对闭合的开标签也兜底处理）
  out = out.replace(/<video[^>]*>[\s\S]*?<\/video>|<video[^>]*>/gi, (tag) =>
    rebuildVideoTag(tag, videos),
  );

  // video-box 链接（href="…/video/{id}"）同样升级为播放器
  out = out.replace(
    /<a[^>]*href=(?:"[^"]*zhihu\.com\/video\/(\d+)[^"]*"|'[^']*zhihu\.com\/video\/(\d+)[^']*')[^>]*>[\s\S]*?<\/a>/gi,
    (full: string, id1: string, id2: string) => {
      const id = id1 || id2;
      const resolved = id ? videos[id] : undefined;
      return resolved ? videoPlayer(resolved.url, resolved.poster, id) : full;
    },
  );

  // 图片：在通用标签过滤之前处理
  out = out.replace(/<img[^>]*>/gi, (tag) => rewriteImgTag(tag));

  // 其余标签：白名单过滤，除 a[href] 外丢弃所有属性
  out = out.replace(
    /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g,
    (full, rawName: string, rawAttrs: string) => {
      const name = rawName.toLowerCase();
      const closing = full.startsWith("</");
      if (!ALLOWED_TAGS.has(name)) return "";
      if (closing) return `</${name}>`;
      // img/video 在上面已安全重建，原样放行
      if (name === "img" || name === "video") return full;
      if (name === "a") {
        const m = rawAttrs.match(/\shref=(?:"([^"]*)"|'([^']*)')/i);
        const href = m?.[1] || m?.[2] || "";
        if (!href) return "<a>";
        const safe = /^(https?:|\/\/|\/|#|mailto:)/i.test(href) ? href : "#";
        return `<a href="${escapeHtml(safe)}" target="_blank" rel="noopener">`;
      }
      return `<${name}>`;
    },
  );

  return out;
}
