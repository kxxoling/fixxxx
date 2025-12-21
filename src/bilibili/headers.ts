import { safeJson } from "./utils";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

let cachedCookie: string | null = null;
let lastFetch = 0;

function generateBuvid3() {
  const uuid = crypto.randomUUID().toUpperCase();
  const suffix = Math.floor(Math.random() * 100000)
    .toString()
    .padStart(5, "0");
  return `${uuid}${suffix}infoc`;
}

export async function getHeaders(): Promise<Record<string, string>> {
  const now = Date.now();
  // Cache for 1 hour
  if (!cachedCookie || now - lastFetch > 3600000) {
    try {
      const resp = await fetch(
        "https://api.bilibili.com/x/frontend/finger/spi",
        {
          headers: {
            "User-Agent": USER_AGENT,
          },
        },
      );
      const data = (await safeJson(resp)) as any;
      const b3 = data?.data?.b_3;
      if (b3) {
        cachedCookie = `buvid3=${b3}`;
        lastFetch = now;
      } else {
        cachedCookie = `buvid3=${generateBuvid3()}`;
      }
    } catch (e) {
      console.error("Failed to fetch SPI", e);
      cachedCookie = `buvid3=${generateBuvid3()}`;
    }
  }

  return {
    "User-Agent": USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7",
    "Accept-Encoding": "gzip, deflate, br",
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
    Connection: "keep-alive",
    Referer: "https://www.bilibili.com/",
    Cookie: cachedCookie || "buvid3=infoc",
  };
}
