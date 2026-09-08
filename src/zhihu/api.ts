import { ZhihuApiError } from "./errors";
import { getApiHeaders } from "./headers";

/**
 * GET 请求一个 api/v4 接口，自动附带新计算的 x-zse-96 签名。
 *
 * 签名原文是请求 URL 的 pathname+search，因此两者必须由同一个
 * `pathWithQuery` 值构造。
 */
export async function zhihuApiGet(pathWithQuery: string): Promise<any | null> {
  const url = `https://www.zhihu.com${pathWithQuery}`;
  const response = await fetch(url, {
    headers: await getApiHeaders(pathWithQuery),
  });

  return handleApiResponse(response);
}

/**
 * GET 一个 api/v4 返回的 paging.next URL（绝对或绝对路径形式）。
 * 签名必须精确覆盖该 URL 的 pathname+search，所以都从同一个解析结果派生。
 */
export async function zhihuApiGetUrl(absoluteUrl: string): Promise<any | null> {
  const parsed = new URL(absoluteUrl, "https://www.zhihu.com");
  return zhihuApiGet(`${parsed.pathname}${parsed.search}`);
}

// 处理办法（页面只陈述问题，不下发指引）：
// 设置环境变量 ZHIHU_COOKIE（登录知乎后从浏览器复制的完整 Cookie，
// 需包含 d_c0 与 z_c0），详见 README「知乎」章节。

async function handleApiResponse(response: Response): Promise<any | null> {
  const bodyText = await response.text();

  let data: any = null;
  try {
    data = bodyText ? JSON.parse(bodyText) : null;
  } catch {
    data = null;
  }

  if (response.status === 404 || data?.error?.code === 404) {
    return null;
  }

  if (!response.ok || data?.error) {
    const code = data?.error?.code ?? response.status;

    if (code === 40352) {
      throw new ZhihuApiError(
        "知乎风控拦截（40352 人机验证墙）：当前会话被拒绝，游客身份无法访问该接口。",
        code,
        data,
      );
    }

    // 游客会话拿到的不是 JSON 而是 zse-ck JS/WASM 挑战页，
    // 与 40352 同属一层风控，统一处理
    if (
      bodyText.includes("zh-zse-ck") ||
      bodyText.includes("/account/unhuman")
    ) {
      throw new ZhihuApiError(
        "知乎风控拦截（zse-ck 挑战 / 安全验证页）：当前会话被拒绝，游客身份无法访问该接口。",
        40352,
        { body: bodyText.slice(0, 512) },
      );
    }

    const message = data?.error?.message || `HTTP ${response.status}`;
    throw new ZhihuApiError(message, code, data);
  }

  return data;
}

/**
 * 问题的回答列表 feed。include 串是 web 端发送的原始编码形式，
 * 签名必须逐字符覆盖它。
 */
export function buildQuestionFeedsPath(
  id: string,
  order: "default" | "updated" = "default",
): string {
  const include = [
    "data%5B%2A%5D.is_normal",
    "admin_closed_comment",
    "reward_info",
    "is_collapsed",
    "annotation_action",
    "annotation_detail",
    "collapse_reason",
    "is_sticky",
    "collapsed_by",
    "suggest_edit",
    "comment_count",
    "can_comment",
    "content",
    "editable_content",
    "attachment",
    "voteup_count",
    "reshipment_settings",
    "comment_permission",
    "created_time",
    "updated_time",
    "review_info",
    "relevant_info",
    "question",
    "excerpt",
    "is_labeled",
    "paid_info",
    "paid_info_content",
    "reaction_instruction",
    "relationship.is_authorized",
    "is_author",
    "voting",
    "is_thanked",
    "is_nothelp",
    "%3Bdata%5B%2A%5D.mark_infos%5B%2A%5D.url",
    "%3Bdata%5B%2A%5D.author.follower_count",
    "vip_info",
    "badge%5B%2A%5D.topics",
    "%3Bdata%5B%2A%5D.settings.table_of_content.enabled",
  ].join("%2C");
  return `/api/v4/questions/${id}/feeds?include=${include}&limit=5&offset=0&order=${order}&platform=desktop`;
}

export function buildQuestionMetaPath(id: string): string {
  return `/api/v4/questions/${id}?include=detail,visit_count`;
}

export function buildArticlePath(id: string): string {
  return `/api/v4/articles/${id}`;
}

/** 单个回答（对应 /question/{qid}/answer/{aid} 深链形态）。 */
export function buildAnswerPath(aid: string): string {
  return `/api/v4/answers/${aid}?include=content,excerpt,attachment,voteup_count,comment_count,created_time,updated_time,question`;
}

/** 视频元信息，含预签名 mp4 播放地址列表。 */
export function buildVideoPath(videoId: string): string {
  return `/api/v4/videos/${videoId}`;
}
