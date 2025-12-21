import type { OpusInfo } from "./opus";
import type { TimelineInfo } from "./timeline";
import type { Comment, VideoInfo } from "./video";

export function renderVideoPage(video: VideoInfo, comments: Comment[]) {
  return renderPage(
    {
      title: video.title,
      desc: video.desc,
      pic: video.pic,
      url: `https://www.bilibili.com/video/${video.bvid}`,
      type: "video.other",
      videoUrl: `https://player.bilibili.com/player.html?bvid=${video.bvid}&high_quality=1`,
      author: video.owner,
      stat: video.stat,
      content: "", // Video content is handled via iframe in template
      pages: video.pages,
    },
    comments,
  );
}

export function renderTimelinePage(timeline: TimelineInfo) {
  const imagesHtml =
    timeline.content.images
      ?.map(
        (img) =>
          `<img src="${img}" referrerpolicy="no-referrer" style="max-width: 100%; margin-bottom: 10px; border-radius: 8px;">`,
      )
      .join("") || "";

  return renderPage(
    {
      title: `${timeline.author.name}'s Dynamic`,
      desc: timeline.content.text,
      pic: timeline.content.images?.[0] || timeline.author.face,
      url: `https://t.bilibili.com/${timeline.id}`,
      type: "article",
      author: timeline.author,
      stat: { view: timeline.stat.view || 0, reply: timeline.stat.reply },
      content: `<p style="white-space: pre-wrap;">${timeline.content.text}</p>${imagesHtml}`,
    },
    [],
  );
}

export function renderOpusPage(opus: OpusInfo) {
  // Render structured content
  const contentHtml = opus.content
    .map((para: any) => {
      const debugComment = `<!-- ${JSON.stringify(para)} -->`;

      if (para.para_type === 1) {
        // Text
        const text =
          para.text?.nodes
            ?.map((node: any) => {
              if (node.type === "TEXT_NODE_TYPE_WORD") {
                return node.word?.words || "";
              }
              return "";
            })
            .join("") || "";

        // If text is only whitespace/newlines, maybe just return the debug comment or a simple br
        if (!text.trim()) {
          return `${debugComment}`;
        }

        return `${debugComment}<p>${text.replace(/\n/g, "<br>")}</p>`;
      } else if (para.para_type === 2) {
        // Image
        const images =
          para.pic?.pics
            ?.map((pic: any) => {
              return `<img src="${pic.url}" referrerpolicy="no-referrer" style="max-width: 100%; margin: 10px 0; border-radius: 8px;">`;
            })
            .join("") || "";
        return `${debugComment}${images}`;
      }
      return debugComment;
    })
    .join("");

  return renderPage(
    {
      title: opus.title,
      desc: opus.summary,
      pic: opus.banner_url,
      url: `https://www.bilibili.com/opus/${opus.id}`,
      type: "article",
      author: opus.author,
      stat: {
        view: 0,
        reply: opus.stat.reply,
        like: opus.stat.like,
        coin: opus.stat.coin,
      },
      content: contentHtml,
    },
    [],
  );
}

interface PageData {
  title: string;
  desc: string;
  pic: string;
  url: string;
  type: string;
  videoUrl?: string;
  author: { name: string; face: string };
  stat: {
    view: number;
    danmaku?: number;
    reply: number;
    like?: number;
    coin?: number;
  };
  content: string;
  pages?: { page: number; part: string; duration: number }[];
}

function renderPage(data: PageData, comments: Comment[]) {
  const {
    title,
    desc,
    pic,
    url,
    type,
    videoUrl,
    author,
    stat,
    content,
    pages,
  } = data;

  // Format comments
  const commentsHtml = comments
    .map((c) => {
      const repliesHtml = c.replies
        ? c.replies
            .map(
              (r) => `
      <div class="comment reply">
        <p><b>${r.member.uname}</b>: ${r.content.message}</p>
        <div class="meta">Like: ${r.like}</div>
      </div>
    `,
            )
            .join("")
        : "";

      return `
    <div class="comment">
      <div class="user">
        <img src="${c.member.avatar}" alt="${c.member.uname}" referrerpolicy="no-referrer">
        <span>${c.member.uname}</span>
      </div>
      <p>${c.content.message}</p>
      <div class="meta">Like: ${c.like}</div>
      ${repliesHtml ? `<div class="replies">${repliesHtml}</div>` : ""}
    </div>
  `;
    })
    .join("");

  // Multi-video parts
  let pagesHtml = "";
  if (pages && pages.length > 1) {
    pagesHtml = `
      <div class="pages">
        <h3>Video Parts</h3>
        <ul>
          ${pages
            .map(
              (p) => `
            <li>
              <span class="part-num">P${p.page}</span>
              <span class="part-title">${p.part}</span>
              <span class="part-duration">(${Math.floor(p.duration / 60)}:${(p.duration % 60).toString().padStart(2, "0")})</span>
            </li>
          `,
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  <!-- Open Graph / Telegram -->
  <meta property="og:site_name" content="Bilibili Instant View">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${desc.substring(0, 200)}...">
  <meta property="og:image" content="${pic}">
  <meta property="og:url" content="${url}">
  <meta property="og:type" content="${type}">
  ${
    videoUrl
      ? `
  <meta property="og:video" content="${videoUrl}">
  <meta property="og:video:url" content="${videoUrl}">
  <meta property="og:video:secure_url" content="${videoUrl}">
  <meta property="og:video:type" content="text/html">
  <meta property="og:video:width" content="640">
  <meta property="og:video:height" content="360">
  `
      : ""
  }

  <!-- Twitter Card -->
  <meta name="twitter:card" content="${videoUrl ? "player" : "summary_large_image"}">
  <meta name="twitter:site" content="@bilibili">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${desc.substring(0, 200)}...">
  <meta name="twitter:image" content="${pic}">
  ${
    videoUrl
      ? `
  <meta name="twitter:player" content="${videoUrl}">
  <meta name="twitter:player:width" content="640">
  <meta name="twitter:player:height" content="360">
  `
      : ""
  }

  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f4f4f4; }
    .video-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; margin-bottom: 20px; background: #000; border-radius: 8px; }
    .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    .stats { color: #666; font-size: 0.9rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 10px; }
    .up-info { display: flex; align-items: center; gap: 5px; font-weight: bold; }
    .up-info img { width: 24px; height: 24px; border-radius: 50%; }
    .desc { white-space: pre-wrap; margin-bottom: 2rem; background: #fff; padding: 15px; border-radius: 8px; }
    .comment { background: #fff; padding: 15px; margin-bottom: 10px; border-radius: 8px; }
    .comment .user { display: flex; align-items: center; margin-bottom: 5px; font-weight: bold; }
    .comment .user img { width: 24px; height: 24px; border-radius: 50%; margin-right: 10px; }
    .comment p { margin: 5px 0; }
    .comment .meta { font-size: 0.8rem; color: #999; }
    .replies { margin-left: 20px; border-left: 2px solid #eee; padding-left: 10px; margin-top: 10px; }
    .reply { background: #f9f9f9; }
    .pages { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 20px; }

    .pages h3 { margin-top: 0; font-size: 1.1rem; }
    .pages ul { list-style: none; padding: 0; margin: 0; }
    .pages li { padding: 5px 0; border-bottom: 1px solid #eee; display: flex; gap: 10px; }
    .pages li:last-child { border-bottom: none; }
    .part-num { color: #666; font-family: monospace; }
    .part-title { flex-grow: 1; }
    .part-duration { color: #999; font-size: 0.9rem; margin-left: auto; }
    
    /* Opus/Timeline specific */
    .content-body { background: #fff; padding: 20px; border-radius: 8px; margin-bottom: 20px; line-height: 1.6; }
    .content-body img { max-width: 100%; height: auto; border-radius: 4px; }
  </style>
</head>
<body>
  ${
    videoUrl
      ? `
  <div class="video-container">
    <iframe src="${videoUrl}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true"></iframe>
  </div>
  `
      : ""
  }
  
  <h1>${title}</h1>
  <div class="stats">
    <div class="up-info">
      <img src="${author.face}" alt="${author.name}" referrerpolicy="no-referrer">
      <span>${author.name}</span>
    </div>
    <span>
    ${stat.danmaku !== undefined ? `| Views: ${stat.view}` : ""}
    ${stat.danmaku !== undefined ? `| Danmaku: ${stat.danmaku}` : ""}
    ${stat.reply ? `| Replies: ${stat.reply}` : ""} ${stat.like ? `| Likes: ${stat.like}` : ""} ${stat.coin ? `| Coins: ${stat.coin}` : ""}
    </span>
  </div>
  
  ${pagesHtml}

  ${content ? `<div class="content-body">${content}</div>` : `<div class="desc">${desc}</div>`}
  
  ${
    comments.length > 0
      ? `
  <h2>Top Comments</h2>
  <div class="comments">
    ${commentsHtml}
  </div>
  `
      : ""
  }
</body>
</html>`;
}
