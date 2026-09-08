import { buildXZse96, X_ZSE_93 } from "./signature";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

const DC0_PATTERN = /d_c0=([^;\s]+)/;

interface GuestSession {
  cookie: string;
  dc0: string;
}

let cachedSession: GuestSession | null = null;
let lastFetch = 0;

function getEnvCookie(): string | null {
  const env = (globalThis as Record<string, any>).process?.env ?? {};
  return env.ZHIHU_COOKIE || null;
}

/**
 * POST https://www.zhihu.com/udid 会发放长效的游客设备 Cookie `d_c0`，
 * 它既是 api/v4 游客请求的 Cookie，也是签名原料。该端点不受风控拦截。
 */
async function fetchGuestSession(): Promise<GuestSession> {
  const resp = await fetch("https://www.zhihu.com/udid", {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      Referer: "https://www.zhihu.com/",
      Origin: "https://www.zhihu.com",
    },
  });

  const jar: Record<string, string> = {};
  for (const c of resp.headers.getSetCookie?.() ?? []) {
    const m = c.match(/^([^=]+)=([^;]*)/);
    if (m?.[2] && m[2] !== "deleted") {
      jar[m[1].trim()] = m[2].trim();
    }
  }

  if (!jar.d_c0) {
    throw new Error("知乎 udid 接口没有返回 d_c0");
  }

  const cookie = Object.entries(jar)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
  return { cookie, dc0: jar.d_c0 };
}

/**
 * 返回 api/v4 请求使用的 Cookie 串 + d_c0。
 *
 * 优先级：用户设置的 ZHIHU_COOKIE 环境变量（在游客流量会被 40352
 * 拦截的环境——如 Vercel 数据中心 IP——是必须的），
 * 其次缓存的游客会话，最后现场引导一个（d_c0 有效期约 2 年，每周刷新）。
 */
export async function getSession(): Promise<GuestSession> {
  const envCookie = getEnvCookie();
  if (envCookie) {
    const m = envCookie.match(DC0_PATTERN);
    if (m) {
      return { cookie: envCookie, dc0: m[1] };
    }
    console.error("ZHIHU_COOKIE 已设置但其中没有 d_c0，回退到游客会话");
  }

  const now = Date.now();
  if (!cachedSession || now - lastFetch > 7 * 24 * 3600 * 1000) {
    cachedSession = await fetchGuestSession();
    lastFetch = now;
  }
  return cachedSession;
}

export async function getApiHeaders(
  pathWithQuery: string,
): Promise<Record<string, string>> {
  const session = await getSession();
  return {
    "User-Agent": USER_AGENT,
    Accept: "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://www.zhihu.com/",
    "x-requested-with": "fetch",
    "x-zse-93": X_ZSE_93,
    "x-zse-96": buildXZse96(pathWithQuery, session.dc0),
    Cookie: session.cookie,
  };
}

export { USER_AGENT };
