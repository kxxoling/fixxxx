import { describe, expect, mock, test } from "bun:test";
import { buildAnswerPath, buildVideoPath } from "@/zhihu/api";
import { getAnswerInfo, getQuestionInfo, parseAnswer } from "@/zhihu/question";
import { sanitizeContentHtml } from "@/zhihu/sanitize";
import type { ZhihuVideo } from "@/zhihu/video";
import {
  extractVideoIds,
  pickVideoStream,
  resolveZhihuVideo,
} from "@/zhihu/video";

const answerFixture = await Bun.file(
  `${import.meta.dir}/fixtures/answer-2074801511054435905.json`,
).json();
const video0Fixture = await Bun.file(
  `${import.meta.dir}/fixtures/video-1300000000000000000.json`,
).json();
const video1Fixture = await Bun.file(
  `${import.meta.dir}/fixtures/video-1300000000000000001.json`,
).json();
const metaFixture = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-meta.json`,
).json();
const feedsFixture = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-feeds.json`,
).json();

const originalFetch = global.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function udidResponse(): Response {
  return new Response("ok", {
    headers: {
      "set-cookie": "d_c0=test-dc0-guest|1700000000; Path=/; Domain=.zhihu.com",
    },
  });
}

describe("知乎视频提取", () => {
  test("extractVideoIds 识别 data-video-id 属性、视频链接和 attachment", () => {
    const html = `<p>x</p><video data-video-id="1300000000000000000"></video>
      <a href="https://www.zhihu.com/video/1300000000000000001">v</a>`;
    const attachment = JSON.stringify({
      type: "video",
      url: "https://www.zhihu.com/video/1300000000000000002",
    });
    expect(extractVideoIds(html, attachment)).toEqual([
      "1300000000000000000",
      "1300000000000000001",
      "1300000000000000002",
    ]);
    expect(extractVideoIds("", undefined)).toEqual([]);
  });

  test("pickVideoStream 选最大的 mp4 并保留封面", () => {
    const picked = pickVideoStream(video0Fixture) as ZhihuVideo;
    expect(picked.url).toContain("hd.mp4");
    expect(picked.poster).toContain("zhimg.com");
  });

  test("pickVideoStream 跳过非 mp4 条目，空时返回 null", () => {
    expect(
      pickVideoStream({ playlist: [{ format: "hls", play_url: "x" }] }),
    ).toBeNull();
    expect(pickVideoStream({})).toBeNull();
    expect(pickVideoStream({ playlist: [] })).toBeNull();
  });

  test("resolveZhihuVideo 请求签名后的 videos 接口", async () => {
    const fetchMock = mock(async (input: any, _init?: any) => {
      const url = String(input);
      if (url.includes("/udid")) return udidResponse();
      if (url.includes("/api/v4/videos/1300000000000000000")) {
        return jsonResponse(video0Fixture);
      }
      throw new Error(`unexpected url: ${url}`);
    });
    global.fetch = fetchMock as any;
    try {
      const video = await resolveZhihuVideo("1300000000000000000");
      expect(video?.url).toContain("hd.mp4");
      const videoCall = fetchMock.mock.calls.find(([input]: any[]) =>
        String(input).includes("/api/v4/videos/1300000000000000000"),
      );
      expect(videoCall).toBeDefined();
      expect((videoCall?.[1] as any).headers["x-zse-96"]).toMatch(/^2\.0_/);
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("上游失败时 resolveZhihuVideo 返回 null", async () => {
    global.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/udid")) return udidResponse();
      return jsonResponse({ error: { code: 404 } }, 404);
    }) as any;
    try {
      expect(await resolveZhihuVideo("1")).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("知乎视频渲染", () => {
  const videos: Record<string, ZhihuVideo> = {
    "1300000000000000000": {
      url: "https://vdn3.vzuu.com/hd.mp4?auth_key=x",
      poster: "https://pic1.zhimg.com/v2-cover_b.jpg",
    },
  };

  test("已解析 id 的 video 标签变成内嵌播放器", () => {
    const out = sanitizeContentHtml(
      `<video data-video-id="1300000000000000000" poster="https://pic1.zhimg.com/v2-old.jpg"></video>`,
      videos,
    );
    expect(out).toContain('<video controls preload="metadata"');
    expect(out).toContain("vdn3.vzuu.com/hd.mp4");
    expect(out).toContain('data-vid="1300000000000000000"');
    expect(out).toContain("/proxy/image?url=");
  });

  test("已解析 id 的 video-box 链接变成内嵌播放器", () => {
    const out = sanitizeContentHtml(
      `<a class="video-box" href="https://www.zhihu.com/video/1300000000000000000"><span>视频</span></a>`,
      videos,
    );
    expect(out).toContain("<video controls");
    expect(out).not.toContain("video-box");
  });

  test("带 CDN 直链 src 的 video 无映射也可播放", () => {
    const out = sanitizeContentHtml(
      `<video src="https://vdn3.vzuu.com/direct.mp4"></video>`,
      {},
    );
    expect(out).toContain("direct.mp4");
    expect(out).toContain("<video controls");
  });

  test("无法解析的视频保留占位提示", () => {
    const out = sanitizeContentHtml(
      `<video data-video-id="999"></video><video src="https://www.zhihu.com/video/999"></video>`,
      {},
    );
    expect(out.match(/原文包含视频/g)).toHaveLength(2);
    expect(out).not.toContain("<video");
  });
});

describe("知乎单回答", () => {
  test("buildAnswerPath 与 buildVideoPath", () => {
    expect(buildAnswerPath("123")).toBe(
      "/api/v4/answers/123?include=content,excerpt,attachment,voteup_count,comment_count,created_time,updated_time,question",
    );
    expect(buildVideoPath("42")).toBe("/api/v4/videos/42");
  });

  test("parseAnswer 从正文收集视频 id", () => {
    const answer = parseAnswer(answerFixture);
    expect(answer.videoIds).toEqual([
      "1300000000000000000",
      "1300000000000000001",
    ]);
  });

  test("getAnswerInfo 抓取回答并解析全部视频", async () => {
    const fetchMock = mock(async (input: any) => {
      const url = String(input);
      if (url.includes("/udid")) return udidResponse();
      if (url.includes("/api/v4/answers/2074801511054435905")) {
        return jsonResponse(answerFixture);
      }
      if (url.includes("/api/v4/videos/1300000000000000000")) {
        return jsonResponse(video0Fixture);
      }
      if (url.includes("/api/v4/videos/1300000000000000001")) {
        return jsonResponse(video1Fixture);
      }
      throw new Error(`unexpected url: ${url}`);
    });
    global.fetch = fetchMock as any;

    try {
      const page = await getAnswerInfo("2074801511054435905");
      expect(page?.question.id).toBe("14205168722");
      expect(page?.question.title).toContain("治愈");
      expect(page?.answer.voteupCount).toBe(3421);
      expect(Object.keys(page?.answer.videos ?? {})).toEqual([
        "1300000000000000000",
        "1300000000000000001",
      ]);
      expect(page?.answer.videos["1300000000000000000"].url).toContain(
        "hd.mp4",
      );
      expect(page?.url).toBe(
        "https://www.zhihu.com/question/14205168722/answer/2074801511054435905",
      );
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("404 answer maps to null", async () => {
    global.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/udid")) return udidResponse();
      return jsonResponse({ error: { code: 404 } }, 404);
    }) as any;
    try {
      expect(await getAnswerInfo("1")).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("知乎问题参数", () => {
  test("maxAnswers 限制页数和结果数", async () => {
    const fetchMock = mock(async (input: any) => {
      const url = String(input);
      if (url.includes("/udid")) return udidResponse();
      if (url.includes("/api/v4/questions/19550227?")) {
        return jsonResponse(metaFixture);
      }
      if (url.includes("/feeds?")) return jsonResponse(feedsFixture);
      throw new Error(`unexpected url: ${url}`);
    });
    global.fetch = fetchMock as any;

    try {
      const info = await getQuestionInfo("19550227", { maxAnswers: 3 });
      // feeds 第 1 页有 2 个真实回答，全部保留，不抓第 2 页
      expect(info?.answers).toHaveLength(2);
      const feedCalls = fetchMock.mock.calls.filter(([input]: any[]) =>
        String(input).includes("/feeds?"),
      );
      expect(feedCalls).toHaveLength(1);
      expect(String(feedCalls[0][0])).toContain("order=default");
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("order=updated 透传到签名后的 feed 请求", async () => {
    const fetchMock = mock(async (input: any) => {
      const url = String(input);
      if (url.includes("/udid")) return udidResponse();
      if (url.includes("/api/v4/questions/19550227?")) {
        return jsonResponse(metaFixture);
      }
      if (url.includes("/feeds?")) return jsonResponse(feedsFixture);
      throw new Error(`unexpected url: ${url}`);
    });
    global.fetch = fetchMock as any;

    try {
      await getQuestionInfo("19550227", { order: "updated" });
      const feedCall = fetchMock.mock.calls.find(([input]: any[]) =>
        String(input).includes("/feeds?"),
      );
      expect(String(feedCall?.[0])).toContain("order=updated");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
