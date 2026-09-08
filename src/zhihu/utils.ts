/** HTML 转义（用于正文和属性值）。 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** meta 标签内容转义：合并换行为空格，避免破坏属性。 */
export function escapeMeta(text: string): string {
  return escapeHtml(text)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

export function formatTimestamp(unix: number): string {
  if (!unix) return "";
  // 知乎是国内站点：无论服务器时区如何都固定渲染北京时间
  // （Vercel 跑在 UTC；bun test 也会强制 UTC）
  const d = new Date((unix + 8 * 3600) * 1000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function formatIso(iso: string): string {
  if (!iso) return "";
  return iso.substring(0, 10);
}

/** 图片统一走本地代理，绕过图床防盗链。 */
export function proxied(url: string): string {
  return `/proxy/image?url=${encodeURIComponent(url)}`;
}
