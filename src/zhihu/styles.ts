/**
 * 页面 CSS 按层组合：BASE（所有页）+ ANSWER（问题/回答页共用）
 * + 各页专属。替代此前每个页面模板里内联的整段重复样式。
 */

export const BASE_CSS = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; background: #f4f4f4; color: #333; }
    .card { background: #fff; border-radius: 12px; margin: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
    .footer { text-align: center; padding: 20px; }
    .footer a { color: #0659f6; }`;

/** 回答卡片与正文样式（问题页 / 回答页共用）。 */
export const ANSWER_CSS = `
    .answer { border-top: 1px solid #f0f0f0; padding: 16px 20px; }
    .answer-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .answer-meta { flex: 1; min-width: 0; }
    .author-name { font-weight: bold; color: #333; text-decoration: none; }
    .headline { color: #999; font-size: 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .voteup { color: #0659f6; font-size: 0.8rem; font-weight: bold; white-space: nowrap; }
    .answer-content { color: #333; font-size: 0.92rem; line-height: 1.75; word-break: break-word; }
    .answer-content img { max-width: 100%; border-radius: 6px; margin: 6px 0; }
    .answer-content video { width: 100%; border-radius: 6px; background: #000; margin: 6px 0; display: block; }
    .answer-content p { margin: 10px 0; }
    .answer-content a { color: #0659f6; }
    .answer-content blockquote { border-left: 3px solid #e8e8e8; padding-left: 12px; color: #777; margin: 10px 0; }
    .answer-content pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; }
    .answer-content code { font-family: SFMono-Regular, Consolas, monospace; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.85em; }
    .answer-content pre code { background: none; padding: 0; }
    .answer-content table { border-collapse: collapse; margin: 10px 0; width: 100%; }
    .answer-content th, .answer-content td { border: 1px solid #e8e8e8; padding: 6px 10px; font-size: 0.85rem; }
    .answer-foot { color: #999; font-size: 0.75rem; margin-top: 10px; display: flex; gap: 8px; flex-wrap: wrap; }
    .answer-foot a { color: #999; }`;

/** 问题页头部与问题描述。 */
export const QUESTION_CSS = `
    .q-head { padding: 20px 20px 12px; }
    .q-head h1 { font-size: 1.4rem; line-height: 1.4; margin-bottom: 10px; }
    .q-stats { color: #999; font-size: 0.85rem; display: flex; flex-wrap: wrap; gap: 12px; }
    .q-detail { padding: 0 20px 16px; color: #555; font-size: 0.9rem; line-height: 1.7; }
    .q-detail img { max-width: 100%; border-radius: 6px; }
    .q-detail p { margin: 8px 0; }`;

/** 回答页头部与页脚（覆盖 BASE 的 footer 为多链接布局）。 */
export const ANSWER_PAGE_CSS = `
    .q-head { padding: 20px 20px 12px; }
    .q-head h1 { font-size: 1.4rem; line-height: 1.4; margin-bottom: 6px; }
    .q-head a { text-decoration: none; color: inherit; }
    .q-sub { color: #999; font-size: 0.85rem; }
    .footer { display: flex; gap: 16px; justify-content: center; flex-wrap: wrap; }`;

/** 专栏页头部、统计与正文。 */
export const ARTICLE_CSS = `
    .head { padding: 24px 20px 12px; }
    .head h1 { font-size: 1.5rem; line-height: 1.4; margin-bottom: 14px; }
    .author-row { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; }
    .author-meta { flex: 1; min-width: 0; }
    .author-name { font-weight: bold; color: #333; text-decoration: none; }
    .headline { color: #999; font-size: 0.75rem; }
    .cover { width: 100%; margin: 12px 0; }
    .stats { color: #999; font-size: 0.8rem; padding: 0 20px 8px; display: flex; gap: 12px; flex-wrap: wrap; }
    .content { padding: 8px 20px 24px; color: #333; font-size: 0.95rem; line-height: 1.8; word-break: break-word; }
    .content img { max-width: 100%; border-radius: 6px; margin: 8px 0; }
    .content p { margin: 12px 0; }
    .content a { color: #0659f6; }
    .content h1, .content h2, .content h3, .content h4 { margin: 18px 0 8px; line-height: 1.4; }
    .content blockquote { border-left: 3px solid #e8e8e8; padding-left: 12px; color: #777; margin: 12px 0; }
    .content pre { background: #f6f8fa; padding: 12px; border-radius: 6px; overflow-x: auto; font-size: 0.8rem; }
    .content code { font-family: SFMono-Regular, Consolas, monospace; background: #f0f0f0; padding: 1px 4px; border-radius: 3px; font-size: 0.85em; }
    .content pre code { background: none; padding: 0; }
    .content table { border-collapse: collapse; margin: 12px 0; width: 100%; }
    .content th, .content td { border: 1px solid #e8e8e8; padding: 6px 10px; font-size: 0.85rem; }`;
