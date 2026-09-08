import { describe, expect, mock, test } from "bun:test";
import { getArticleInfo } from "@/zhihu/article";
import { getApiHeaders } from "@/zhihu/headers";
import { getQuestionInfo } from "@/zhihu/question";

const metaFixture = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-meta.json`,
).json();
const feedsFixture = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-feeds.json`,
).json();
const feedsPage2Fixture = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-feeds-page2.json`,
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

describe("知乎签名 API 客户端", () => {
  test("getApiHeaders 精确签名请求路径", async () => {
    global.fetch = (async () => udidResponse()) as any;
    try {
      const headers = await getApiHeaders("/api/v4/articles/123");
      expect(headers["x-zse-93"]).toBe("101_3_3.0");
      expect(headers["x-zse-96"]).toMatch(/^2\.0_[A-Za-z0-9+/=]{64}$/);
      expect(headers.Cookie).toContain("d_c0=");
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("getQuestionInfo 翻页抓取、按回答去重且每页都签名", async () => {
    const fetchMock = mock(async (input: any, _init?: any) => {
      const url = String(input);
      if (url.includes("/udid")) {
        return udidResponse();
      }
      if (url.includes("/api/v4/questions/19550227?")) {
        return jsonResponse(metaFixture);
      }
      if (url.includes("/feeds?")) {
        // offset=0 是第 1 页，offset=5 是第 2 页
        if (url.includes("offset=5")) {
          return jsonResponse(feedsPage2Fixture);
        }
        return jsonResponse(feedsFixture);
      }
      throw new Error(`unexpected url: ${url}`);
    });
    global.fetch = fetchMock as any;

    try {
      const info = await getQuestionInfo("19550227");
      expect(info?.title).toContain("Google");
      // 第 1 页 2 个回答，第 2 页 1 新 1 重复，共 3 个
      expect(info?.answers).toHaveLength(3);
      expect(info?.answers[2].author.name).toBe("第三位作者");
      // meta + 两个 feed 页，全部带签名
      expect(fetchMock.mock.calls).toHaveLength(3);
      for (const [input, init] of fetchMock.mock.calls) {
        const url = new URL(String(input));
        expect((init as any).headers["x-zse-96"]).toMatch(/^2\.0_/);
        // 签名串等于请求 URL 的 path+search
        expect(String(input)).toBe(
          `https://www.zhihu.com${url.pathname}${url.search}`,
        );
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("404 upstream maps to null", async () => {
    global.fetch = (async () =>
      jsonResponse({ error: { code: 404 } }, 404)) as any;
    try {
      expect(await getArticleInfo("1")).toBeNull();
      expect(await getQuestionInfo("1")).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("40352 风控映射为 ZhihuApiError（只陈述问题，不下发指引）", async () => {
    global.fetch = (async () =>
      jsonResponse(
        { error: { code: 40352, message: "系统监测到您的网络环境存在异常" } },
        403,
      )) as any;
    try {
      try {
        await getArticleInfo("123");
        throw new Error("should have thrown");
      } catch (e: any) {
        expect(e.name).toBe("ZhihuApiError");
        expect(e.code).toBe(40352);
        expect(e.message).toContain("40352");
        // 指引只存在于注释/README，不进页面消息
        expect(e.message).not.toContain("ZHIHU_COOKIE");
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("zse-ck 挑战页映射为同一风控错误", async () => {
    global.fetch = (async () =>
      new Response(
        '<!DOCTYPE html><html><head><meta id="zh-zse-ck" content="token"></head></html>',
        { status: 403, headers: { "content-type": "text/html" } },
      )) as any;
    try {
      try {
        await getArticleInfo("123");
        throw new Error("should have thrown");
      } catch (e: any) {
        expect(e.name).toBe("ZhihuApiError");
        expect(e.code).toBe(40352);
        expect(e.message).toContain("zse-ck");
        expect(e.message).not.toContain("ZHIHU_COOKIE");
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
