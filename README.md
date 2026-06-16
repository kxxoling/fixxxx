# fixxxx

Instant View 代理服务。为 Telegram 等支持 Instant View 的客户端提供网页的可读页面。

目前支持 Bilibili 和 Weibo 部分页面，后续会接入更多站点。

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
└── weibo/
    ├── errors.ts         # WeiboApiError 错误类
    ├── headers.ts        # 请求头与访客 Cookie 管理（m.weibo.cn）
    ├── status.ts         # 微博动态/视频数据获取与解析
    ├── user.ts           # 用户主页数据获取与解析
    └── render.ts         # HTML 页面渲染（含 Open Graph meta）
api/
└── index.ts              # Vercel Edge Function 入口
test/
├── bilibili/             # Bilibili 单元测试与 fixtures
└── weibo/                # Weibo 单元测试与 fixtures
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
