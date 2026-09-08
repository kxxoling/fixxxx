import type { ZhihuAnswerInfo } from "./question";
import { sanitizeContentHtml, videoPlayer } from "./sanitize";
import { escapeHtml, escapeMeta, formatTimestamp, proxied } from "./utils";

export function avatarImg(avatarUrl: string, name: string): string {
  if (!avatarUrl) return "";
  const src = avatarUrl.startsWith("//")
    ? proxied(`https:${avatarUrl}`)
    : proxied(avatarUrl);
  return `<img class="avatar" src="${src}" alt="${escapeHtml(name)}">`;
}

/**
 * 存在于回答 attachment（而非正文 HTML）中的视频的播放器
 * （正文里的视频已被清洗函数标上 data-vid）。
 */
function appendedVideosHtml(answer: ZhihuAnswerInfo, content: string): string {
  return Object.entries(answer.videos)
    .filter(([id]) => !content.includes(`data-vid="${id}"`))
    .map(([, video]) => videoPlayer(video.url, video.poster, undefined))
    .join("\n");
}

/** 单条回答卡片：作者头部 + 清洗后的正文 + 投票/时间/评论脚注。 */
export function answerCard(
  answer: ZhihuAnswerInfo,
  index: number,
  questionId: string,
): string {
  const content = sanitizeContentHtml(answer.contentHtml, answer.videos);
  const extraVideos = appendedVideosHtml(answer, content);
  const authorUrl = answer.author.urlToken
    ? `https://www.zhihu.com/people/${escapeHtml(answer.author.urlToken)}`
    : "#";
  return `
    <div class="answer" id="answer-${escapeHtml(answer.id)}">
      <div class="answer-head">
        ${avatarImg(answer.author.avatarUrl, answer.author.name)}
        <div class="answer-meta">
          <a class="author-name" href="${authorUrl}">${escapeHtml(answer.author.name)}</a>
          ${answer.author.headline ? `<div class="headline">${escapeMeta(answer.author.headline)}</div>` : ""}
        </div>
        <div class="voteup">${answer.voteupCount} 赞同</div>
      </div>
      <div class="answer-content">${content || `<p>${escapeHtml(answer.excerpt)}</p>`}${extraVideos}</div>
      <div class="answer-foot">
        <span>回答 #${index + 1}</span>
        ${answer.createdTime ? `<span>&middot; ${formatTimestamp(answer.createdTime)}</span>` : ""}
        <span>&middot; ${answer.commentCount} 评论</span>
        ${
          answer.id
            ? `<a href="https://www.zhihu.com/question/${escapeHtml(questionId)}/answer/${escapeHtml(answer.id)}">在知乎查看</a>`
            : ""
        }
      </div>
    </div>`;
}
