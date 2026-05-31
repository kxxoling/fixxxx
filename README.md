# fixxxx

Bilibili Instant View 代理服务。为 Telegram 等支持 Instant View 的客户端提供 Bilibili 内容的可读页面，支持视频、动态和专栏文章。

## 支持的内容类型

| 路由           | 说明                                    | 示例                        |
| -------------- | --------------------------------------- | --------------------------- |
| `/video/:bvid` | Bilibili 视频（含分P信息和热门评论）    | `/video/BV1GJ411x7h7`       |
| `/t/:id`       | Bilibili 动态（图文、纯文字、视频动态） | `/t/1141736312467882000`    |
| `/opus/:id`    | Bilibili 专栏文章（图文混排）           | `/opus/1056353752004427792` |

## 技术栈

- **运行时**: [Bun](https://bun.sh/)
- **Web 框架**: [Hono](https://hono.dev/)
- **代码规范**: [Biome](https://biomejs.dev/)
- **Git Hooks**: [Husky](https://typicode.github.io/husky/)

## 项目结构

```
src/
├── index.ts              # Hono 路由入口
└── bilibili/
    ├── errors.ts         # BilibiliApiError 错误类
    ├── headers.ts        # 请求头与 buvid3 Cookie 管理
    ├── opus.ts           # 专栏文章数据获取与解析
    ├── render.ts         # HTML 页面渲染（含 Open Graph meta）
    ├── timeline.ts       # 动态数据获取与解析
    ├── utils.ts          # 工具函数（safeJson）
    ├── video.ts          # 视频信息与评论获取
    └── wbi.ts            # WBI 签名
api/
└── index.ts              # Vercel Edge Function 入口
test/
└── bilibili/             # 单元测试与 fixtures
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

项目支持三种部署方式：

### Cloudflare Workers

已配置 [wrangler.toml](./wrangler.toml) 和 GitHub Actions 自动部署（推送到 `master` 分支触发）。

需要在 GitHub 仓库设置中配置 Secrets：

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

### Vercel

已配置 [vercel.json](./vercel.json)，Edge Function 入口在 `api/index.ts`。

### Docker

```bash
docker build -t fixxxx .
docker run -p 3000:3000 fixxxx
```

## 错误处理

- Bilibili API 返回错误时，页面会展示错误码和错误信息（HTTP 502）
- 资源不存在时返回 404 页面
- 未知错误返回 500 页面
