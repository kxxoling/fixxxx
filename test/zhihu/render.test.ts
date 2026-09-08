import { describe, expect, test } from "bun:test";
import { parseArticle } from "@/zhihu/article";
import {
  parseAnswer,
  parseQuestionFeeds,
  parseQuestionMeta,
  type ZhihuAnswerPageInfo,
  type ZhihuQuestionInfo,
} from "@/zhihu/question";
import {
  renderAnswerPage,
  renderArticlePage,
  renderQuestionPage,
} from "@/zhihu/render";
import { sanitizeContentHtml } from "@/zhihu/sanitize";
import { pickVideoStream } from "@/zhihu/video";

const meta = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-meta.json`,
).json();
const feeds = await Bun.file(
  `${import.meta.dir}/fixtures/question-19550227-feeds.json`,
).json();
const article = await Bun.file(
  `${import.meta.dir}/fixtures/article-123456789.json`,
).json();
const answerFixture = await Bun.file(
  `${import.meta.dir}/fixtures/answer-2074801511054435905.json`,
).json();
const video0Fixture = await Bun.file(
  `${import.meta.dir}/fixtures/video-1300000000000000000.json`,
).json();
const video1Fixture = await Bun.file(
  `${import.meta.dir}/fixtures/video-1300000000000000001.json`,
).json();

function buildQuestion(): ZhihuQuestionInfo {
  const info = parseQuestionMeta(meta);
  info.answers = parseQuestionFeeds(feeds);
  return info;
}

/**
 * 页面级通用校验：结构是合法的完整 HTML 文档，
 * 且 OG / Twitter Card 等 Instant View 必需的 meta 齐全。
 */
function expectWellFormedPage(html: string): void {
  expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
  expect(html.endsWith("</html>")).toBe(true);
  expect(html).toContain('<html lang="zh-CN">');
  expect(html).toContain("<head>");
  expect(html).toContain("</head>");
  expect(html).toContain("<body>");
  expect(html).toContain("</body>");
  expect(html).toContain('<meta charset="UTF-8">');
  expect(html).toContain('name="viewport"');
  // OG 必需字段
  expect(html).toContain('property="og:title"');
  expect(html).toContain('property="og:description"');
  expect(html).toContain('property="og:url"');
  expect(html).toContain('property="og:type"');
  expect(html).toContain('name="twitter:card"');
  // 标签配对抽查：视频标签必须成对闭合
  const opens = (html.match(/<video\b/g) ?? []).length;
  const closes = (html.match(/<\/video>/g) ?? []).length;
  expect(opens).toBe(closes);
}

describe("知乎内容清洗", () => {
  test("剥离 script 和不支持的标签但保留文字", () => {
    const html = sanitizeContentHtml(
      "<p>hi<script>alert(1)</script><span>keep</span></p>",
    );
    expect(html).toContain("hi");
    expect(html).toContain("keep");
    expect(html).not.toContain("script");
    expect(html).not.toContain("span");
    expect(html).not.toContain("alert");
  });

  test("把懒加载图片重写为代理后的真实地址", () => {
    const html = sanitizeContentHtml(
      '<img src="data:image/svg+xml;utf8,placeholder" data-actualsrc="https://picx.zhimg.com/80/v2-real_720w.jpg" data-rawwidth="720">',
    );
    expect(html).toContain("/proxy/image?url=");
    expect(html).toContain(
      encodeURIComponent("https://picx.zhimg.com/80/v2-real_720w.jpg"),
    );
    expect(html).not.toContain("data:image/svg");
  });

  test("链接保留 href、丢弃其他属性", () => {
    const html = sanitizeContentHtml(
      '<p onclick="evil()" class="x" data-foo="1">a<a href="https://www.zhihu.com" data-track="t">link</a></p>',
    );
    expect(html).toContain('href="https://www.zhihu.com"');
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("data-track");
    expect(html).not.toContain("class=");
  });

  test("iframe 转为链接并丢弃协议相对地址", () => {
    const html = sanitizeContentHtml(
      '<iframe src="https://www.youtube.com/embed/xyz" width="560"></iframe>',
    );
    expect(html).toContain("https://www.youtube.com/embed/xyz");
    expect(html).not.toContain("iframe");
  });

  test("处理协议相对的图片地址", () => {
    const html = sanitizeContentHtml('<img src="//picx.zhimg.com/a.jpg">');
    expect(html).toContain(encodeURIComponent("https://picx.zhimg.com/a.jpg"));
  });
});

describe("知乎问题渲染", () => {
  test("渲染问题页（合法 HTML + OG meta + 回答）", () => {
    const html = renderQuestionPage(buildQuestion());
    expectWellFormedPage(html);
    expect(html).toContain("知乎 Instant View");
    expect(html).toContain("Google 已经关闭或停止维护的产品有哪些？");
    expect(html).toContain(
      'property="og:url" content="https://www.zhihu.com/question/19550227"',
    );
    expect(html).toContain("示例作者");
    expect(html).toContain("1024 赞同");
    expect(html).toContain("匿名用户");
    expect(html).toContain("328 回答");
    expect(html).toContain("/question/19550227/answer/2744801099");
    // fixture 里的 script 必须被剥掉
    expect(html).not.toContain("alert");
  });

  test("无可用图片时不输出 og:image", () => {
    const q = buildQuestion();
    q.answers = [];
    const html = renderQuestionPage(q);
    expect(html).not.toContain('property="og:image"');
  });
});

describe("知乎专栏渲染", () => {
  test("渲染专栏页（合法 HTML + OG meta、封面、清洗后的正文）", () => {
    const html = renderArticlePage(parseArticle(article));
    expectWellFormedPage(html);
    expect(html).toContain("知乎专栏 Instant View");
    expect(html).toContain("示例：如何优雅地写一篇知乎专栏");
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain("专栏作者");
    expect(html).toContain("写作方法论");
    expect(html).toContain("666 赞同");
    expect(html).toContain('property="article:published_time"');
    // iframe 转成了链接
    expect(html).toContain("https://www.youtube.com/embed/xyz");
    expect(html).not.toContain("<iframe");
  });
});

describe("知乎回答页渲染", () => {
  function buildAnswerPage(): ZhihuAnswerPageInfo {
    const answer = parseAnswer(answerFixture);
    for (const id of answer.videoIds) {
      const stream = id.endsWith("000")
        ? pickVideoStream(video0Fixture)
        : pickVideoStream(video1Fixture);
      if (stream) answer.videos[id] = stream;
    }
    return {
      question: {
        id: answerFixture.question.id.toString(),
        title: answerFixture.question.title,
      },
      answer,
      url: `https://www.zhihu.com/question/${answerFixture.question.id}/answer/${answer.id}`,
    };
  }

  test("渲染回答页（合法 HTML + OG + 内嵌视频播放器）", () => {
    const html = renderAnswerPage(buildAnswerPage());
    expectWellFormedPage(html);
    expect(html).toContain("你见过最治愈的视频是什么？");
    expect(html).toContain(
      'property="og:url" content="https://www.zhihu.com/question/14205168722/answer/2074801511054435905"',
    );
    expect(html).toContain("阿樟");
    expect(html).toContain("3421 赞同");
    // 两个视频都升级为内嵌播放器：正文 video 标签 + video-box 链接
    expect((html.match(/<video controls/g) ?? []).length).toBe(2);
    expect(html).toContain("hd.mp4");
    expect(html).not.toContain("video-box");
    // 海报图走代理
    expect(html).toContain("/proxy/image?url=");
    // 正文里的懒加载图片也被还原
    expect(html).not.toContain("data:image/svg");
    expect(html).toContain("查看全部回答");
  });
});
