import { safeJson } from "../bilibili/utils";

const USER_AGENT =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

const VISITOR_HOST = "https://visitor.passport.weibo.cn";

let cachedCookie: string | null = null;
let lastFetch = 0;

function mergeCookies(cookieMap: Record<string, string>, setCookies: string[]) {
  for (const c of setCookies) {
    const m = c.match(/^([^=]+)=([^;]*)/);
    if (m && m[2] !== "deleted") {
      cookieMap[m[1].trim()] = m[2].trim();
    }
  }
}

function toCookieStr(cookieMap: Record<string, string>): string {
  return Object.entries(cookieMap)
    .map(([k, v]) => `${k}=${v}`)
    .join("; ");
}

async function fetchVisitorCookie(): Promise<string> {
  const cookieMap: Record<string, string> = {};

  // Step 1: Visit m.weibo.cn to get WEIBOCN_FROM cookie
  const homeResp = await fetch("https://m.weibo.cn/", {
    headers: { "User-Agent": USER_AGENT },
    redirect: "manual",
  });
  mergeCookies(cookieMap, homeResp.headers.getSetCookie?.() ?? []);

  // Step 2: genvisitor on visitor.passport.weibo.cn (domain .weibo.cn)
  const genResp = await fetch(`${VISITOR_HOST}/visitor/genvisitor`, {
    method: "POST",
    headers: {
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
      Referer: "https://m.weibo.cn/",
      Cookie: toCookieStr(cookieMap),
    },
    body: new URLSearchParams({
      cb: "gen_callback",
      fp: JSON.stringify({
        os: "2",
        browser: "Safari,17,0,0",
        fonts: "undefined",
        screenInfo: "375*812*30",
        plugins: "",
      }),
    }),
  });
  mergeCookies(cookieMap, genResp.headers.getSetCookie?.() ?? []);
  const genText = await genResp.text();
  const genMatch = genText.match(/gen_callback\((.+)\)/s);
  if (!genMatch) throw new Error("Failed to parse genvisitor response");
  const tid = JSON.parse(genMatch[1])?.data?.tid;
  if (!tid) throw new Error("No tid from genvisitor");

  // Step 3: incarnate to get SUB (domain .weibo.cn)
  const incResp = await fetch(
    `${VISITOR_HOST}/visitor/visitor?a=incarnate&t=${tid}&w=2&c=100&gc=&cb=cross_domain&from=weibo&_rand=${Date.now()}`,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Referer: "https://m.weibo.cn/",
        Cookie: toCookieStr(cookieMap),
      },
    },
  );
  mergeCookies(cookieMap, incResp.headers.getSetCookie?.() ?? []);
  const incText = await incResp.text();
  const incMatch = incText.match(/cross_domain\((.+)\)/s);
  if (incMatch) {
    const incData = JSON.parse(incMatch[1]);
    if (incData?.data?.sub) {
      cookieMap.SUB = incData.data.sub;
      if (incData.data.subp) cookieMap.SUBP = incData.data.subp;
    }
  }

  // Step 4: Visit m.weibo.cn with SUB to get _T_WM
  const revisitResp = await fetch("https://m.weibo.cn/", {
    headers: {
      "User-Agent": USER_AGENT,
      Cookie: toCookieStr(cookieMap),
    },
    redirect: "manual",
  });
  mergeCookies(cookieMap, revisitResp.headers.getSetCookie?.() ?? []);

  return toCookieStr(cookieMap);
}

export async function getHeaders(): Promise<Record<string, string>> {
  const now = Date.now();
  if (!cachedCookie || now - lastFetch > 3600000) {
    try {
      cachedCookie = await fetchVisitorCookie();
      lastFetch = now;
    } catch (e) {
      console.error("Failed to fetch Weibo visitor cookie:", e);
      if (!cachedCookie) cachedCookie = "";
    }
  }

  return {
    "User-Agent": USER_AGENT,
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
    Referer: "https://m.weibo.cn/",
    "X-Requested-With": "XMLHttpRequest",
    "MWeibo-Pwa": "1",
    Cookie: cachedCookie,
  };
}

export { safeJson };
