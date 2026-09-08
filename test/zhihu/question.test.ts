import { describe, expect, test } from "bun:test";
import {
  buildArticlePath,
  buildQuestionFeedsPath,
  buildQuestionMetaPath,
} from "@/zhihu/api";
import { parseArticle } from "@/zhihu/article";
import {
  collectAnswers,
  parseAnswer,
  parseQuestionFeeds,
  parseQuestionMeta,
} from "@/zhihu/question";

const meta = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-meta.json`,
).json();
const feeds = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-feeds.json`,
).json();
const feedsPage2 = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-feeds-page2.json`,
).json();
const article = await Bun.file(
  `${import.meta.dir}/fixtures/article-123456789.json`,
).json();

describe("知乎问题解析", () => {
  test("解析问题 meta", () => {
    const info = parseQuestionMeta(meta);
    expect(info.id).toBe("19550227");
    expect(info.title).toContain("Google");
    expect(info.answerCount).toBe(328);
    expect(info.followerCount).toBe(2450);
    expect(info.visitCount).toBe(1234567);
    expect(info.url).toBe("https://www.zhihu.com/question/19550227");
  });

  test("解析 feeds 并跳过已删除的回答", () => {
    const answers = parseQuestionFeeds(feeds);
    expect(answers).toHaveLength(2);
    expect(answers[0].author.name).toBe("示例作者");
    expect(answers[0].voteupCount).toBe(1024);
    expect(answers[0].contentHtml).toContain("Google Reader");
    expect(answers[1].author.name).toBe("匿名用户");
  });

  test("parseAnswer 容忍缺失字段", () => {
    const answer = parseAnswer(null);
    expect(answer.author.name).toBe("匿名用户");
    expect(answer.voteupCount).toBe(0);
  });

  test("collectAnswers 在分页结束时停止且不发多余请求", async () => {
    const endPage = { ...feeds, paging: { is_end: true, next: "" } };
    const answers = await collectAnswers(endPage);
    expect(answers).toHaveLength(2);
  });

  test("collectAnswers 容忍空页", async () => {
    expect(await collectAnswers(null)).toEqual([]);
    expect(await collectAnswers({ data: [] })).toEqual([]);
  });

  test("collectAnswers 合并两个 fixture 页", async () => {
    const originalFetch = global.fetch;
    global.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("/udid")) {
        return new Response("ok", {
          headers: {
            "set-cookie":
              "d_c0=test-dc0-guest|1700000000; Path=/; Domain=.zhihu.com",
          },
        });
      }
      expect(url).toContain("offset=5");
      return new Response(JSON.stringify(feedsPage2), {
        headers: { "content-type": "application/json" },
      });
    }) as any;
    try {
      const answers = await collectAnswers(feeds);
      // page1: 2 answers; page2: 1 duplicate (2744801099) + 1 new
      expect(answers).toHaveLength(3);
      expect(answers[2].author.name).toBe("第三位作者");
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("解析专栏文章", () => {
    const info = parseArticle(article);
    expect(info.id).toBe("123456789");
    expect(info.title).toContain("专栏");
    expect(info.author.name).toBe("专栏作者");
    expect(info.columnName).toBe("写作方法论");
    expect(info.url).toBe("https://zhuanlan.zhihu.com/p/123456789");
    expect(info.titleImage).toContain("zhimg.com");
  });
});

describe("知乎 API 路径构造", () => {
  test("问题 meta 路径", () => {
    expect(buildQuestionMetaPath("123")).toBe(
      "/api/v4/questions/123?include=detail,visit_count",
    );
  });

  test("专栏路径", () => {
    expect(buildArticlePath("456")).toBe("/api/v4/articles/456");
  });

  test("feeds 路径包含编码后的 include 和分页参数", () => {
    const path = buildQuestionFeedsPath("789");
    expect(path.startsWith("/api/v4/questions/789/feeds?include=")).toBe(true);
    expect(path).toContain("%5B%2A%5D");
    expect(path).toContain("content");
    expect(path).toContain("limit=5");
    expect(path).toContain("platform=desktop");
    expect(path).not.toContain(" ");
  });
});
