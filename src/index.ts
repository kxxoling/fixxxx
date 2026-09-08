import { Hono } from "hono";
import { BangumiApiError } from "./bangumi/errors";
import { renderSubjectPage } from "./bangumi/render";
import { getSubjectInfo } from "./bangumi/subject";
import { BilibiliApiError } from "./bilibili/errors";
import { getOpusInfo } from "./bilibili/opus";
import {
  renderOpusPage,
  renderTimelinePage,
  renderVideoPage,
} from "./bilibili/render";
import { getTimelineInfo } from "./bilibili/timeline";
import { getComments, getVideoInfo } from "./bilibili/video";
import { WeiboApiError } from "./weibo/errors";
import {
  renderAlbumPage,
  renderStatusPage,
  renderUserPage,
} from "./weibo/render";
import { getStatusInfo } from "./weibo/status";
import { getAlbumInfo, getUserInfo } from "./weibo/user";
import { getArticleInfo } from "./zhihu/article";
import { ZhihuApiError } from "./zhihu/errors";
import { getAnswerInfo, getQuestionInfo } from "./zhihu/question";
import {
  renderAnswerPage,
  renderArticlePage,
  renderQuestionPage,
} from "./zhihu/render";

const app = new Hono();
export { app };

app.get("/", (c) => {
  return c.text(
    "Instant View Service.\nBilibili: /b/video/:bvid, /b/t/:id, /b/opus/:id\nWeibo: /w/status/:id, /w/u/:uid\nBangumi: /bgm/subject/:id\nZhihu: /z/q/:id (question, ?answers=N&order=updated), /z/q/:qid/answer/:aid (single answer), /z/p/:id (article)",
  );
});

function refererForImage(url: string): string | null {
  let host = "";
  try {
    host = new URL(url).hostname;
  } catch {
    return null;
  }
  switch (true) {
    case host.endsWith("weibo.cn") || host.endsWith("weibo.com"):
      return "https://m.weibo.cn/";
    case host.endsWith("hdslb.com"):
      return "https://www.bilibili.com/";
    case host.endsWith("zhihu.com") || host.endsWith("zhimg.com"):
      return "https://www.zhihu.com/";
    default:
      return null;
  }
}

// Image proxy to bypass Weibo/Bilibili/Zhihu hotlink protection
app.get("/proxy/image", async (c) => {
  const url = c.req.query("url");
  if (!url) {
    return c.text("Missing url parameter", 400);
  }

  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };
  const referer = refererForImage(url);
  if (referer) {
    headers.Referer = referer;
  }

  try {
    const resp = await fetch(url, { headers });

    if (!resp.ok) {
      return c.text(`Failed to fetch image: ${resp.status}`, resp.status);
    }

    const contentType = resp.headers.get("content-type") || "image/jpeg";
    const body = await resp.arrayBuffer();

    return new Response(body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (e) {
    return c.text(`Proxy error: ${e}`, 502);
  }
});

app.get("/b/video/:bvid", async (c) => {
  const bvid = c.req.param("bvid");
  const video = await getVideoInfo(bvid);

  if (!video) {
    return c.notFound();
  }

  const comments = await getComments(video.aid);
  const html = renderVideoPage(video, comments);

  return c.html(html);
});

app.get("/b/t/:id", async (c) => {
  const id = c.req.param("id");
  const timeline = await getTimelineInfo(id);

  if (!timeline) {
    return c.notFound();
  }

  const html = renderTimelinePage(timeline);
  return c.html(html);
});

app.get("/b/opus/:id", async (c) => {
  const id = c.req.param("id");
  // ID is a string (large number)
  const opus = await getOpusInfo(id);

  if (!opus) {
    return c.notFound();
  }

  const html = renderOpusPage(opus);
  return c.html(html);
});

app.get("/w/status/:id", async (c) => {
  const id = c.req.param("id");
  const status = await getStatusInfo(id);

  if (!status) {
    return c.notFound();
  }

  const html = await renderStatusPage(status);
  return c.html(html);
});

app.get("/w/u/:uid", async (c) => {
  const uid = c.req.param("uid");
  const tabtype = c.req.query("tabtype");

  if (tabtype === "album") {
    const album = await getAlbumInfo(uid);
    if (!album) return c.notFound();
    const html = await renderAlbumPage(album);
    return c.html(html);
  }

  const user = await getUserInfo(uid);

  if (!user) {
    return c.notFound();
  }

  const html = await renderUserPage(user);
  return c.html(html);
});

app.get("/bgm/subject/:id", async (c) => {
  const id = c.req.param("id");
  const subject = await getSubjectInfo(id);

  if (!subject) {
    return c.notFound();
  }

  const html = renderSubjectPage(subject);
  return c.html(html);
});

app.get("/z/q/:id", async (c) => {
  const id = c.req.param("id");

  // ?answer=aid is an alias of /z/q/:id/answer/:aid
  const answerParam = c.req.query("answer");
  if (answerParam) {
    return c.redirect(`/z/q/${id}/answer/${answerParam}`);
  }

  const answersParam = Number(c.req.query("answers"));
  const orderParam = c.req.query("order");
  const question = await getQuestionInfo(id, {
    maxAnswers: Number.isFinite(answersParam) ? answersParam : undefined,
    order: orderParam === "updated" ? "updated" : "default",
  });

  if (!question) {
    return c.notFound();
  }

  const html = renderQuestionPage(question);
  return c.html(html);
});

app.get("/z/q/:qid/answer/:aid", async (c) => {
  const aid = c.req.param("aid");
  const page = await getAnswerInfo(aid);

  if (!page) {
    return c.notFound();
  }

  const html = renderAnswerPage(page);
  return c.html(html);
});

app.get("/z/p/:id", async (c) => {
  const id = c.req.param("id");
  const article = await getArticleInfo(id);

  if (!article) {
    return c.notFound();
  }

  const html = renderArticlePage(article);
  return c.html(html);
});

app.notFound((c) => {
  return c.html(
    `
    <!DOCTYPE html>
    <html>
    <head><title>404 Not Found</title></head>
    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>404 Not Found</h1>
      <p>The video or page you are looking for does not exist.</p>
      <a href="/">Go Home</a>
    </body>
    </html>
  `,
    404,
  );
});

app.onError((err, c) => {
  console.error("Server Error:", err);

  if (err instanceof BilibiliApiError) {
    return c.html(
      `
        <!DOCTYPE html>
        <html>
        <head><title>Bilibili API Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Bilibili API Error</h1>
          <p>The upstream Bilibili API returned an error.</p>
          <div style="background: #f8dede; color: #9c1c1c; padding: 15px; border-radius: 5px; display: inline-block; text-align: left; margin: 20px 0;">
            <p><strong>Code:</strong> ${err.code}</p>
            <p><strong>Message:</strong> ${err.message}</p>
          </div>
          <br/>
          <a href="/">Go Home</a>
        </body>
        </html>
      `,
      502, // Bad Gateway / Upstream Error
    );
  }

  if (err instanceof WeiboApiError) {
    return c.html(
      `
        <!DOCTYPE html>
        <html>
        <head><title>Weibo API Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Weibo API Error</h1>
          <p>The upstream Weibo API returned an error.</p>
          <div style="background: #f8dede; color: #9c1c1c; padding: 15px; border-radius: 5px; display: inline-block; text-align: left; margin: 20px 0;">
            <p><strong>Code:</strong> ${err.code}</p>
            <p><strong>Message:</strong> ${err.message}</p>
          </div>
          <br/>
          <a href="/">Go Home</a>
        </body>
        </html>
      `,
      502,
    );
  }

  if (err instanceof BangumiApiError) {
    return c.html(
      `
        <!DOCTYPE html>
        <html>
        <head><title>Bangumi API Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>Bangumi API Error</h1>
          <p>The upstream Bangumi API returned an error.</p>
          <div style="background: #f8dede; color: #9c1c1c; padding: 15px; border-radius: 5px; display: inline-block; text-align: left; margin: 20px 0;">
            <p><strong>Code:</strong> ${err.code}</p>
            <p><strong>Message:</strong> ${err.message}</p>
          </div>
          <br/>
          <a href="/">Go Home</a>
        </body>
        </html>
      `,
      502,
    );
  }

  if (err instanceof ZhihuApiError) {
    // 页面只陈述问题；处理办法见 README「知乎」章节（设置 ZHIHU_COOKIE）
    const riskBlocked = err.code === 40352;
    const safeMessage = String(err.message)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return c.html(
      `
        <!DOCTYPE html>
        <html lang="zh-CN">
        <head><title>知乎 API Error</title></head>
        <body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1>知乎 API Error</h1>
          <p>上游知乎 API 返回错误${riskBlocked ? "（游客会话被风控拦截）" : ""}。</p>
          <div style="background: #f8dede; color: #9c1c1c; padding: 15px; border-radius: 5px; display: inline-block; text-align: left; margin: 20px 0; max-width: 640px;">
            <p><strong>Code:</strong> ${err.code}</p>
            <p><strong>Message:</strong> ${safeMessage}</p>
          </div>
          <br/>
          <a href="/">Go Home</a>
        </body>
        </html>
      `,
      502,
    );
  }

  return c.html(
    `
    <!DOCTYPE html>
    <html>
    <head><title>500 Server Error</title></head>
    <body style="font-family: sans-serif; text-align: center; padding: 50px;">
      <h1>500 Server Error</h1>
      <p>Something went wrong.</p>
      <pre style="background: #f4f4f4; padding: 10px; text-align: left; display: inline-block;">${err.message}</pre>
    </body>
    </html>
  `,
    500,
  );
});

console.log("Server is starting on port 3000...");

export default {
  port: 3000,
  fetch: app.fetch,
};
