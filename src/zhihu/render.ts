import type { ZhihuArticleInfo } from "./article";
import { answerCard, avatarImg } from "./components";
import type { ZhihuAnswerPageInfo, ZhihuQuestionInfo } from "./question";
import { sanitizeContentHtml } from "./sanitize";
import {
  ANSWER_CSS,
  ANSWER_PAGE_CSS,
  ARTICLE_CSS,
  BASE_CSS,
  QUESTION_CSS,
} from "./styles";
import {
  escapeHtml,
  escapeMeta,
  formatIso,
  formatTimestamp,
  proxied,
} from "./utils";

function ogImageTags(ogImage: string): string {
  return ogImage
    ? `\n  <meta property="og:image" content="${escapeHtml(ogImage)}">\n  <meta name="twitter:image" content="${escapeHtml(ogImage)}">`
    : "";
}

function questionDescription(question: ZhihuQuestionInfo): string {
  const base = question.excerpt || question.title;
  return base.substring(0, 200);
}

export function renderQuestionPage(question: ZhihuQuestionInfo): string {
  const title = question.title;
  const detail = sanitizeContentHtml(question.detailHtml);
  const firstAvatar = question.answers[0]?.author.avatarUrl || "";
  const ogImage =
    /^https?:\/\//.test(firstAvatar) || firstAvatar.startsWith("//")
      ? firstAvatar
      : "";
  const answersHtml = question.answers
    .map((a, i) => answerCard(a, i, question.id))
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 知乎</title>

  <meta property="og:site_name" content="知乎 Instant View">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeMeta(title)}">
  <meta property="og:description" content="${escapeMeta(questionDescription(question))}">
  <meta property="og:url" content="${escapeHtml(question.url)}">

  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeMeta(title)}">
  <meta name="twitter:description" content="${escapeMeta(questionDescription(question))}">${ogImageTags(ogImage)}

  <style>${BASE_CSS}${ANSWER_CSS}${QUESTION_CSS}
  </style>
</head>
<body>
 <article>
  <div class="card">
   <header class="q-head">
      <h1>${escapeHtml(title)}</h1>
      <div class="q-stats">
        <span>${question.answerCount} 回答</span>
        <span>${question.followerCount} 关注</span>
        ${question.visitCount ? `<span>${question.visitCount} 浏览</span>` : ""}
        ${question.createdTime ? `<span>创建于 ${formatTimestamp(question.createdTime)}</span>` : ""}
      </div>
   </header>
    ${
      detail
        ? `<div class="q-detail">${detail}</div>`
        : question.excerpt
          ? `<div class="q-detail">${escapeHtml(question.excerpt)}</div>`
          : ""
    }
    ${answersHtml}
    ${
      question.answers.length === 0
        ? `<div class="answer"><p style="color:#999;">暂无法加载回答内容。</p></div>`
        : ""
    }
  </div>

  <div class="footer">
    <a href="${escapeHtml(question.url)}">在知乎查看完整问题（共 ${question.answerCount} 个回答）</a>
  </div>
 </article>
</body>
</html>`;
}

/**
 * 单回答页，对应 /question/{qid}/answer/{aid} 深链：
 * 问题标题头部 + 指定回答 + 查看其余回答的链接。
 */
export function renderAnswerPage(page: ZhihuAnswerPageInfo): string {
  const { question, answer } = page;
  const title = question.title || answer.excerpt.slice(0, 80) || "知乎回答";
  const ogImage =
    /^https?:\/\//.test(answer.author.avatarUrl) ||
    answer.author.avatarUrl.startsWith("//")
      ? answer.author.avatarUrl
      : "";
  const description = answer.excerpt || question.title;
  const card = answerCard(answer, 0, question.id);
  const localQuestionUrl = question.id ? `/z/q/${escapeHtml(question.id)}` : "";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - ${escapeHtml(answer.author.name)}的回答 - 知乎</title>

  <meta property="og:site_name" content="知乎 Instant View">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeMeta(title)}">
  <meta property="og:description" content="${escapeMeta(description.substring(0, 200))}">
  <meta property="og:url" content="${escapeHtml(page.url)}">

  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeMeta(title)}">
  <meta name="twitter:description" content="${escapeMeta(description.substring(0, 200))}">${ogImageTags(ogImage)}

  <style>${BASE_CSS}${ANSWER_CSS}${ANSWER_PAGE_CSS}
  </style>
</head>
<body>
 <article>
  <div class="card">
   <header class="q-head">
      <h1><a href="${escapeHtml(page.url)}">${escapeHtml(title)}</a></h1>
      <div class="q-sub">该问题下的单个回答</div>
   </header>
    ${card}
  </div>

  <div class="footer">
    <a href="${escapeHtml(page.url)}">在知乎查看该回答</a>
    ${localQuestionUrl ? `<a href="${localQuestionUrl}">查看全部回答</a>` : ""}
  </div>
 </article>
</body>
</html>`;
}

export function renderArticlePage(article: ZhihuArticleInfo): string {
  const title = article.title;
  const content = sanitizeContentHtml(article.contentHtml);
  const ogImage = article.titleImage || "";
  const description = article.excerpt || title;
  const authorUrl = article.author.urlToken
    ? `https://www.zhihu.com/people/${escapeHtml(article.author.urlToken)}`
    : "#";

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - 知乎专栏</title>

  <meta property="og:site_name" content="知乎专栏 Instant View">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${escapeMeta(title)}">
  <meta property="og:description" content="${escapeMeta(description.substring(0, 200))}">
  <meta property="og:url" content="${escapeHtml(article.url)}">
  <meta property="article:published_time" content="${escapeHtml(article.created)}">
  <meta property="article:modified_time" content="${escapeHtml(article.updated)}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeMeta(title)}">
  <meta name="twitter:description" content="${escapeMeta(description.substring(0, 200))}">${ogImageTags(ogImage)}

  <style>${BASE_CSS}${ARTICLE_CSS}
  </style>
</head>
<body>
 <article>
  <div class="card">
   <header class="head">
      <h1>${escapeHtml(title)}</h1>
      <div class="author-row">
        ${avatarImg(article.author.avatarUrl, article.author.name)}
        <div class="author-meta">
          <a class="author-name" href="${authorUrl}">${escapeHtml(article.author.name)}</a>
          ${article.author.headline ? `<div class="headline">${escapeMeta(article.author.headline)}</div>` : ""}
        </div>
      </div>
   </header>
    <div class="stats">
      ${article.columnName ? `<span>${escapeHtml(article.columnName)}</span>` : ""}
      ${article.created ? `<span>发布于 ${formatIso(article.created)}</span>` : ""}
      ${article.updated && article.updated !== article.created ? `<span>编辑于 ${formatIso(article.updated)}</span>` : ""}
      <span>${article.voteupCount} 赞同</span>
      <span>${article.commentCount} 评论</span>
    </div>
    ${
      article.titleImage
        ? `<img class="cover" src="${proxied(article.titleImage)}" alt="${escapeHtml(title)}">`
        : ""
    }
    <div class="content">${content || `<p>${escapeHtml(article.excerpt)}</p>`}</div>
  </div>

  <div class="footer">
    <a href="${escapeHtml(article.url)}">在知乎专栏查看原文</a>
  </div>
 </article>
</body>
</html>`;
}
