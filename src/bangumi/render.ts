import type { BangumiSubjectInfo } from "./subject";
import { TYPE_NAMES } from "./subject";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeMeta(text: string): string {
  return escapeHtml(text)
    .replace(/[\r\n]+/g, " ")
    .trim();
}

function formatNumber(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万`;
  return n.toString();
}

function renderRatingBar(count: Record<string, number>, max: number): string {
  const bars: string[] = [];
  for (let i = 10; i >= 1; i--) {
    const c = count[i.toString()] || 0;
    const pct = max > 0 ? (c / max) * 100 : 0;
    bars.push(
      `<div style="display:flex;flex-direction:column;align-items:center;gap:2px;flex:1;">
        <div style="width:80%;height:36px;display:flex;align-items:flex-end;">
          <div style="width:100%;height:${Math.max(pct, 2)}%;background:#ff8200;border-radius:2px 2px 0 0;min-height:2px;"></div>
        </div>
        <span style="font-size:0.7rem;color:#999;">${i}</span>
      </div>`,
    );
  }
  return bars.join("");
}

function renderInfobox(infobox: BangumiSubjectInfo["infobox"]): string {
  const rows: string[] = [];
  for (const item of infobox) {
    if (Array.isArray(item.value)) {
      const parts = item.value
        .map((v) => {
          if (v.k) {
            return `<a href="${escapeHtml(v.v)}" style="color:#ff8200;">${escapeHtml(v.k)}</a>`;
          }
          return escapeHtml(v.v);
        })
        .join(" / ");
      rows.push(
        `<tr><td style="padding:4px 12px;color:#999;white-space:nowrap;vertical-align:top;">${escapeHtml(item.key)}</td><td style="padding:4px 0;">${parts}</td></tr>`,
      );
    } else {
      rows.push(
        `<tr><td style="padding:4px 12px;color:#999;white-space:nowrap;vertical-align:top;">${escapeHtml(item.key)}</td><td style="padding:4px 0;">${escapeHtml(item.value)}</td></tr>`,
      );
    }
  }
  return rows.join("");
}

export function renderSubjectPage(subject: BangumiSubjectInfo): string {
  const typeName = TYPE_NAMES[subject.type] || "其他";
  const title = subject.nameCn || subject.name;

  const tagsHtml = subject.tags
    .map(
      (t) =>
        `<span style="display:inline-block;background:#f0f0f0;padding:3px 10px;border-radius:12px;font-size:0.8rem;color:#666;">${escapeHtml(t.name)} (${t.count})</span>`,
    )
    .join(" ");

  const ratingBarHtml = renderRatingBar(
    subject.rating.count,
    Math.max(...Object.values(subject.rating.count), 1),
  );

  const collection = subject.collection;
  const collectionHtml = `
    <div style="display:flex;gap:15px;flex-wrap:wrap;">
      <div><span style="font-weight:bold;">${formatNumber(collection.wish)}</span><br><span style="font-size:0.8rem;color:#999;">想看</span></div>
      <div><span style="font-weight:bold;">${formatNumber(collection.doing)}</span><br><span style="font-size:0.8rem;color:#999;">在看</span></div>
      <div><span style="font-weight:bold;">${formatNumber(collection.collect)}</span><br><span style="font-size:0.8rem;color:#999;">看过</span></div>
      <div><span style="font-weight:bold;">${formatNumber(collection.onHold)}</span><br><span style="font-size:0.8rem;color:#999;">搁置</span></div>
      <div><span style="font-weight:bold;">${formatNumber(collection.dropped)}</span><br><span style="font-size:0.8rem;color:#999;">抛弃</span></div>
    </div>`;

  const infoboxHtml = renderInfobox(subject.infobox);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Bangumi</title>

  <meta property="og:site_name" content="Bangumi Instant View">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeMeta(title)}">
  <meta property="og:description" content="${escapeMeta(subject.summary.substring(0, 200))}">
  <meta property="og:image" content="${subject.cover}">
  <meta property="og:url" content="${subject.url}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeMeta(title)}">
  <meta name="twitter:description" content="${escapeMeta(subject.summary.substring(0, 200))}">
  <meta name="twitter:image" content="${subject.cover}">

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; background: #f4f4f4; color: #333; }
    .card { background: #fff; border-radius: 12px; margin: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .header { display: flex; gap: 20px; padding: 20px; }
    .cover { width: 160px; min-width: 160px; border-radius: 8px; object-fit: cover; aspect-ratio: 2/3; }
    .info { flex: 1; }
    .info h1 { font-size: 1.3rem; margin-bottom: 4px; }
    .info .name-original { color: #999; font-size: 0.9rem; margin-bottom: 8px; }
    .info .meta { color: #666; font-size: 0.85rem; margin-bottom: 8px; }
    .info .type-badge { display: inline-block; background: #ff8200; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; }
    .section { padding: 16px 20px; }
    .section + .section { border-top: 1px solid #f0f0f0; }
    .section-title { font-size: 1rem; font-weight: bold; margin-bottom: 10px; }
    .summary { color: #555; font-size: 0.9rem; line-height: 1.6; white-space: pre-wrap; }
    .rating-box { display: flex; gap: 20px; align-items: flex-start; }
    .rating-score { font-size: 2.5rem; font-weight: bold; color: #ff8200; line-height: 1; }
    .rating-detail { font-size: 0.8rem; color: #999; }
    .rating-bars { flex: 1; }
    .tags { display: flex; flex-wrap: wrap; gap: 6px; }
    .infobox-table { width: 100%; }
    .footer { text-align: center; padding: 20px; }
    .footer a { color: #ff8200; }
  </style>
</head>
<body>
 <article>
  <div class="card">
   <header class="header">
      ${subject.cover ? `<img class="cover" src="${subject.cover}" alt="${escapeHtml(title)}">` : ""}
      <div class="info">
        <h1>${escapeHtml(title)}</h1>
        ${subject.name && subject.nameCn ? `<div class="name-original">${escapeHtml(subject.name)}</div>` : ""}
        <div class="meta">
          <span class="type-badge">${typeName}</span>
          ${subject.date ? ` &middot; ${escapeHtml(subject.date)}` : ""}
          ${subject.platform ? ` &middot; ${escapeHtml(subject.platform)}` : ""}
          ${subject.totalEpisodes ? ` &middot; ${subject.totalEpisodes}话` : ""}
        </div>
        ${subject.rating.total > 0 ? `<div style="margin-top:8px;"><span style="font-size:1.5rem;font-weight:bold;color:#ff8200;">${subject.rating.score.toFixed(1)}</span> <span style="font-size:0.8rem;color:#999;">${formatNumber(subject.rating.total)}人评分${subject.rating.rank > 0 ? ` &middot; 排名 #${subject.rating.rank}` : ""}</span></div>` : ""}
      </div>
   </header>

    ${
      infoboxHtml
        ? `<div class="section">
      <div class="section-title">详细信息</div>
      <table class="infobox-table">${infoboxHtml}</table>
    </div>`
        : ""
    }

    ${
      subject.tags.length > 0
        ? `<div class="section">
      <div class="section-title">标签</div>
      <div class="tags">${tagsHtml}</div>
    </div>`
        : ""
    }

    <div class="section">
      <div class="section-title">收藏统计</div>
      ${collectionHtml}
    </div>

    ${
      subject.summary
        ? `<div class="section">
      <div class="section-title">简介</div>
      <div class="summary">${escapeHtml(subject.summary)}</div>
    </div>`
        : ""
    }

    ${
      subject.rating.total > 0
        ? `<div class="section">
      <div class="section-title">评分分布</div>
      <div style="display:flex;gap:2px;">${ratingBarHtml}</div>
    </div>`
        : ""
    }
  </div>

  <div class="footer">
    <a href="${subject.url}">在 Bangumi 查看完整页面</a>
  </div>
 </article>
</body>
</html>`;
}
