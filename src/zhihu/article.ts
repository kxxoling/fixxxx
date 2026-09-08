import { buildArticlePath, zhihuApiGet } from "./api";

export interface ZhihuArticleInfo {
  id: string;
  title: string;
  contentHtml: string;
  excerpt: string;
  titleImage: string;
  voteupCount: number;
  commentCount: number;
  created: string;
  updated: string;
  author: {
    name: string;
    headline: string;
    avatarUrl: string;
    urlToken: string;
  };
  columnName: string;
  url: string;
}

export function parseArticle(data: any): ZhihuArticleInfo {
  return {
    id: data?.id?.toString() || "",
    title: data?.title || "",
    contentHtml: data?.content || "",
    excerpt: data?.excerpt || "",
    titleImage: data?.image_url || "",
    voteupCount: data?.voteup_count ?? 0,
    commentCount: data?.comment_count ?? 0,
    created: data?.created || "",
    updated: data?.updated || "",
    author: {
      name: data?.author?.name || "",
      headline: data?.author?.headline || "",
      avatarUrl: data?.author?.avatar_url || "",
      urlToken: data?.author?.url_token || "",
    },
    columnName: data?.column?.title || "",
    url: data?.id ? `https://zhuanlan.zhihu.com/p/${data.id}` : "",
  };
}

export async function getArticleInfo(
  id: string,
): Promise<ZhihuArticleInfo | null> {
  const data = await zhihuApiGet(buildArticlePath(id));
  if (!data || (!data.id && !data.title)) return null;
  return parseArticle(data);
}
