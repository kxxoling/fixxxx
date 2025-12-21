import { Hono } from "hono";
import { BilibiliApiError } from "./bilibili/errors";
import { getOpusInfo } from "./bilibili/opus";
import {
  renderOpusPage,
  renderTimelinePage,
  renderVideoPage,
} from "./bilibili/render";
import { getTimelineInfo } from "./bilibili/timeline";
import { getComments, getVideoInfo } from "./bilibili/video";

const app = new Hono();
export { app };

app.get("/", (c) => {
  return c.text(
    "Instant View Service. Use /video/:bvid, /t/:id, or /opus/:id for Bilibili.",
  );
});

app.get("/video/:bvid", async (c) => {
  const bvid = c.req.param("bvid");
  const video = await getVideoInfo(bvid);

  if (!video) {
    return c.notFound();
  }

  const comments = await getComments(video.aid);
  const html = renderVideoPage(video, comments);

  return c.html(html);
});

app.get("/t/:id", async (c) => {
  const id = c.req.param("id");
  const timeline = await getTimelineInfo(id);

  if (!timeline) {
    return c.notFound();
  }

  const html = renderTimelinePage(timeline);
  return c.html(html);
});

app.get("/opus/:id", async (c) => {
  const id = c.req.param("id");
  // ID is a string (large number)
  const opus = await getOpusInfo(id);

  if (!opus) {
    return c.notFound();
  }

  const html = renderOpusPage(opus);
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
