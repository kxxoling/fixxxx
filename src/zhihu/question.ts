import {
  buildAnswerPath,
  buildQuestionFeedsPath,
  buildQuestionMetaPath,
  zhihuApiGet,
  zhihuApiGetUrl,
} from "./api";
import type { ZhihuVideo } from "./video";
import { extractVideoIds, resolveVideos } from "./video";

/** 回答按 5 个一页抓取（web 端的分页大小）。 */
const MAX_FEED_PAGES = 2;
export const MAX_ANSWERS = 10;

export interface ZhihuAnswerInfo {
  id: string;
  contentHtml: string;
  excerpt: string;
  voteupCount: number;
  commentCount: number;
  createdTime: number;
  updatedTime: number;
  author: {
    name: string;
    headline: string;
    avatarUrl: string;
    urlToken: string;
  };
  /** 该回答正文 / attachment 里引用的视频 id。 */
  videoIds: string[];
  /** 已解析的可播放视频，按视频 id 索引。 */
  videos: Record<string, ZhihuVideo>;
}

export interface ZhihuQuestionInfo {
  id: string;
  title: string;
  detailHtml: string;
  excerpt: string;
  answerCount: number;
  followerCount: number;
  visitCount: number;
  createdTime: number;
  updatedTime: number;
  answers: ZhihuAnswerInfo[];
  url: string;
}

export function parseAnswer(target: any): ZhihuAnswerInfo {
  const contentHtml = target?.content || "";
  const videoIds = extractVideoIds(
    contentHtml,
    target?.attachment ? JSON.stringify(target.attachment) : "",
  );
  return {
    id: target?.id?.toString() || "",
    contentHtml,
    excerpt: target?.excerpt || "",
    voteupCount: target?.voteup_count ?? 0,
    commentCount: target?.comment_count ?? 0,
    createdTime: target?.created_time ?? 0,
    updatedTime: target?.updated_time ?? 0,
    author: {
      name: target?.author?.name || "匿名用户",
      headline: target?.author?.headline || "",
      avatarUrl: target?.author?.avatar_url || "",
      urlToken: target?.author?.url_token || "",
    },
    videoIds,
    videos: {},
  };
}

export function parseQuestionMeta(meta: any): ZhihuQuestionInfo {
  return {
    id: meta?.id?.toString() || "",
    title: meta?.title || "",
    detailHtml: meta?.detail || "",
    excerpt: meta?.excerpt || "",
    answerCount: meta?.answer_count ?? 0,
    followerCount: meta?.follower_count ?? 0,
    visitCount: meta?.visit_count ?? 0,
    createdTime: meta?.created_time ?? 0,
    updatedTime: meta?.updated_time ?? 0,
    answers: [],
    url: meta?.id ? `https://www.zhihu.com/question/${meta.id}` : "",
  };
}

export function parseQuestionFeeds(feeds: any): ZhihuAnswerInfo[] {
  if (!Array.isArray(feeds?.data)) return [];
  return feeds.data
    .map((item: any) => item?.target)
    .filter((t: any) => t && t.type !== "removed")
    .map(parseAnswer);
}

/**
 * 跨 feed 页聚合回答（跟随 paging.next，每页单独签名），最多取
 * `maxAnswers` 个（页数上限 MAX_FEED_PAGES），按回答 id 去重。
 * 游客会话可能拿到的回答偏少或被登录墙截断——拿到什么就展示什么。
 */
export async function collectAnswers(
  firstPage: any,
  maxAnswers = MAX_ANSWERS,
): Promise<ZhihuAnswerInfo[]> {
  const maxPages = Math.max(
    1,
    Math.min(MAX_FEED_PAGES, Math.ceil(maxAnswers / 5)),
  );
  const seen = new Set<string>();
  const answers: ZhihuAnswerInfo[] = [];

  let page: any = firstPage;
  for (let i = 0; i < maxPages && page; i++) {
    for (const answer of parseQuestionFeeds(page)) {
      if (answer.id) {
        if (seen.has(answer.id)) continue;
        seen.add(answer.id);
      }
      answers.push(answer);
      if (answers.length >= maxAnswers) break;
    }
    if (answers.length >= maxAnswers) break;
    if (page?.paging?.is_end || !page?.paging?.next) break;
    if (i >= maxPages - 1) break; // 不要预取超出页数预算的下一页
    page = await zhihuApiGetUrl(page.paging.next);
  }

  return answers.slice(0, maxAnswers);
}

/** 为回答引用的每个视频挂载可播放直链。 */
async function attachVideos(answers: ZhihuAnswerInfo[]): Promise<void> {
  const ids = [...new Set(answers.flatMap((a) => a.videoIds))];
  if (ids.length === 0) return;
  const map = await resolveVideos(ids);
  for (const answer of answers) {
    for (const id of answer.videoIds) {
      if (map[id]) answer.videos[id] = map[id];
    }
  }
}

export interface QuestionOptions {
  /** 展示的回答数量，1..MAX_ANSWERS（默认 10）。 */
  maxAnswers?: number;
  /** feed 排序："default"（热度）或 "updated"（时间）。 */
  order?: "default" | "updated";
}

function clampAnswers(n: number | undefined): number {
  if (!n || Number.isNaN(n)) return MAX_ANSWERS;
  return Math.max(1, Math.min(MAX_ANSWERS, Math.floor(n)));
}

export async function getQuestionInfo(
  id: string,
  options: QuestionOptions = {},
): Promise<ZhihuQuestionInfo | null> {
  const meta = await zhihuApiGet(buildQuestionMetaPath(id));
  if (!meta || (!meta.id && !meta.title)) return null;

  const info = parseQuestionMeta(meta);
  const maxAnswers = clampAnswers(options.maxAnswers);
  const order = options.order === "updated" ? "updated" : "default";

  try {
    const feeds = await zhihuApiGet(buildQuestionFeedsPath(id, order));
    info.answers = await collectAnswers(feeds, maxAnswers);
    await attachVideos(info.answers);
  } catch (e) {
    console.error("问题 feeds 获取失败:", e);
  }

  return info;
}

export interface ZhihuAnswerPageInfo {
  question: {
    id: string;
    title: string;
  };
  answer: ZhihuAnswerInfo;
  url: string;
}

/**
 * 获取单个回答（/question/{qid}/answer/{aid} 深链）。
 * 回答数据自带其所属问题，一次签名请求即可。
 */
export async function getAnswerInfo(
  aid: string,
): Promise<ZhihuAnswerPageInfo | null> {
  const data = await zhihuApiGet(buildAnswerPath(aid));
  if (!data || (!data.id && !data.content)) return null;

  const answer = parseAnswer(data);
  await attachVideos([answer]);

  return {
    question: {
      id: data?.question?.id?.toString() || "",
      title: data?.question?.title || "",
    },
    answer,
    url: `https://www.zhihu.com/question/${data?.question?.id}/answer/${answer.id}`,
  };
}
