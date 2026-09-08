# fixxxx

Instant View 代理服务。为 Telegram 等支持 Instant View 的客户端提供网页的可读页面。

目前支持 Bilibili、Weibo、Bangumi 和知乎部分页面，后续会接入更多站点。

## 支持的站点与路由

### Bilibili

| 路由             | 说明                           | 示例                        |
| ---------------- | ------------------------------ | --------------------------- |
| `/b/video/:bvid` | 视频（含分P信息和热门评论）    | `/b/video/BV1GJ411x7h7`     |
| `/b/t/:id`       | 动态（图文、纯文字、视频动态） | `/b/t/1141736312467882000`  |
| `/b/opus/:id`    | 专栏文章（图文混排）           | `/b/opus/1056353752004427792` |

### Weibo

| 路由                 | 说明               | 示例                              |
| -------------------- | ------------------ | --------------------------------- |
| `/w/status/:id`      | 微博动态/视频详情  | `/w/status/5303880858734627`      |
| `/w/u/:uid`          | 用户主页           | `/w/u/7643376782`                 |
| `/w/u/:uid?tabtype=album` | 用户相册     | `/w/u/7643376782?tabtype=album`   |

支持 bid 和数字 ID，图片自动转 base64 内嵌（绕过防盗链），视频直接播放，用户主页含封面背景、置顶微博和近期微博。

### Bangumi

| 路由               | 说明               | 示例                          |
| ------------------ | ------------------ | ----------------------------- |
| `/bgm/subject/:id` | 条目详情           | `/bgm/subject/514358`         |

支持 bgm.tv 和 bangumi.tv，展示评分、标签、收藏统计、详细信息和简介。

### 知乎

| 路由                       | 说明                                                            | 示例                                                       |
| -------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------- |
| `/z/q/:id`                 | 问题页（问题描述 + 回答聚合，自动翻页）                          | `/z/q/19550227`                                            |
| `/z/q/:id?answers=N`       | 同上，控制展示回答数量（1–10，默认 10）                           | `/z/q/19550227?answers=3`                                  |
| `/z/q/:id?order=updated`   | 同上，按时间排序回答（默认 `default` 热度排序）                    | `/z/q/19550227?order=updated`                              |
| `/z/q/:qid/answer/:aid`    | 单个回答页（对应知乎 `/question/{qid}/answer/{aid}` 分享链接形态） | `/z/q/14205168722/answer/2074801511054435905`              |
| `/z/p/:id`                 | 专栏文章                                                         | `/z/p/697591429`                                           |

`/z/q/:id?answer=:aid` 是回答页的别名，会 302 跳转到 `/z/q/:qid/answer/:aid`。

**视频支持**：回答正文中的知乎视频会自动解析——从正文提取 `video_id` 后调用签名后的 `/api/v4/videos/{id}` 获取 mp4 直链（含多清晰度，自动选最高），内嵌 `<video controls>` 播放器（与 Bilibili/Weibo 的视频直连方案一致），并代理封面图作为 poster。视频直链是带 `auth_key` 的预签名 URL（会过期），过期后播放器降级为占位提示；无法解析时正文会显示"原文包含视频"占位。

#### 反爬实现说明

知乎对游客的防护是三层叠加，签名只是其中一层（实测验证于 2026-09）：

| 层 | 机制 | 本项目状态 |
| --- | --- | --- |
| 1. API 签名 | `x-zse-96`：`udid` 发放游客 `d_c0` → `101_3_3.0 + path?query + d_c0` 取 MD5 → 签名 VM（SM4 变种 + 自定义字母表）加密 | **已完整实现**（`src/zhihu/zse-vm.ts`，纯 TS，Bun/Vercel Edge 均可运行） |
| 2. zse-ck JS 挑战 | HTML 层返回带 `<meta id="zh-zse-ck">` token 的挑战页，需执行 TinyGo 编译的 WASM 计算指纹 cookie `__zse_ck` | 已分析验证：WASM 可在 Bun 中执行并产出真实计算值，但模拟环境算出的值被服务端拒绝（真实 Chrome 算出的值可以通过） |
| 3. 人机验证墙（40352 unhuman） | 游客会话一律拦截，需人工点击验证或登录态 | **无法绕过**：真实 Chrome 无痕窗口（游客）同样被拦 |

**结论：游客身份目前不可行，登录态 Cookie 是唯一可靠通路。** 你自己的浏览器能正常访问知乎，是因为携带了登录会话（`z_c0`）——与 IP 是否"干净"无关（实测家宽直连 IP 上的游客浏览器同样被拦）。

**部署配置（Docker 与 Vercel 相同）**：设置环境变量 `ZHIHU_COOKIE`，值为登录知乎后从浏览器复制的完整 Cookie（必须包含 `d_c0` 与 `z_c0`）。服务自动用其中的 `d_c0` 计算签名、携带完整登录态请求。获取方式：浏览器打开知乎 → F12 → Network → 刷新页面 → 任一 `zhihu.com` 请求 → 复制请求头里的整串 `Cookie` 值。

注意：登录 Cookie 有时效（约 1–3 个月），失效后需手动更换；高频机器调用有触发账号风控的风险，建议控制请求频率。

内容渲染时会对知乎返回的 RichText HTML 做白名单清洗（去 script/iframe、懒加载图片还原为真实地址），图片经 `/proxy/image` 代理并自动附加 `https://www.zhihu.com/` Referer。新式 19 位长 ID（如回答 `2074801511054435905`）在知乎 API 中以字符串返回，全链路按字符串处理避免精度丢失。

## 技术栈

- **运行时**: [Bun](https://bun.sh/)
- **Web 框架**: [Hono](https://hono.dev/)
- **代码规范**: [Biome](https://biomejs.dev/)
- **Git Hooks**: [Husky](https://typicode.github.io/husky/)

## 项目结构

```
src/
├── index.ts              # Hono 路由入口
├── bilibili/
│   ├── errors.ts         # BilibiliApiError 错误类
│   ├── headers.ts        # 请求头与 buvid3 Cookie 管理
│   ├── opus.ts           # 专栏文章数据获取与解析
│   ├── render.ts         # HTML 页面渲染（含 Open Graph meta）
│   ├── timeline.ts       # 动态数据获取与解析
│   ├── utils.ts          # 工具函数（safeJson）
│   ├── video.ts          # 视频信息与评论获取
│   └── wbi.ts            # WBI 签名
├── weibo/
│   ├── errors.ts         # WeiboApiError 错误类
│   ├── headers.ts        # 请求头与访客 Cookie 管理（m.weibo.cn）
│   ├── status.ts         # 微博动态/视频数据获取与解析
│   ├── user.ts           # 用户主页数据获取与解析
│   └── render.ts         # HTML 页面渲染（含 Open Graph meta）
├── bangumi/
│   ├── errors.ts         # BangumiApiError 错误类
│   ├── subject.ts        # 条目数据获取与解析
│   └── render.ts         # HTML 页面渲染（含 Open Graph meta）
└── zhihu/
    ├── errors.ts         # ZhihuApiError 错误类
    ├── md5.ts            # 内置纯 TS MD5（仅签名中间步骤用，原因见文件头注释）
    ├── vm-source.ts      # 签名 VM 原始源码（逐字节提取，不可改动，biome 排除）
    ├── zse-vm.ts         # VM 环境 shim + 执行入口（可跑在 Bun/Edge）
    ├── signature.ts      # 签名原文构造与 x-zse-96 生成
    ├── headers.ts        # 游客 d_c0 引导 / ZHIHU_COOKIE 管理
    ├── api.ts            # 签名 api/v4 请求客户端
    ├── question.ts       # 问题页/单回答页数据获取与解析
    ├── article.ts        # 专栏文章数据获取与解析
    ├── video.ts          # 视频 id 提取与 mp4 直链解析
    ├── utils.ts          # 转义 / 时间格式化 / 图片代理地址
    ├── sanitize.ts       # RichText 清洗（懒加载图片、iframe/视频降级与升级）
    ├── components.ts     # 回答卡片等复用 HTML 片段
    ├── styles.ts         # 页面 CSS（分层组合，问题/回答页共享回答样式）
    └── render.ts         # 三类页面渲染（OG/Twitter meta）
api/
└── index.ts              # Vercel Edge Function 入口
test/
├── bilibili/             # Bilibili 单元测试与 fixtures
├── weibo/                # Weibo 单元测试与 fixtures
├── bangumi/              # Bangumi 单元测试与 fixtures
└── zhihu/                # 知乎单元测试与 fixtures
```

## 本地开发

```bash
# 安装依赖
bun install

# 启动开发服务器（热重载）
bun run dev

# 代码格式化
bun run format

# 代码检查与自动修复
bun run check

# 运行测试
bun test
```

服务默认运行在 `http://localhost:3000`。

## 部署

### Vercel

已配置 [vercel.json](./vercel.json)，Edge Function 入口在 `api/index.ts`。
