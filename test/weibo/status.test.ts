import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getStatusInfo } from "@/weibo/status";

describe("Weibo Status Logic", () => {
  test("fetches and parses video status from fixture", async () => {
    const fixturePath = join(
      process.cwd(),
      "test/weibo/fixtures/status-5303880858734627.json",
    );
    const fixtureData = JSON.parse(readFileSync(fixturePath, "utf-8"));

    const originalFetch = global.fetch;
    const fetchMock = mock((url: string) => {
      // Mock m.weibo.cn homepage for initial cookie
      if (url === "https://m.weibo.cn/") {
        return Promise.resolve(
          new Response("", {
            headers: { "Set-Cookie": "WEIBOCN_FROM=1110003030" },
          }),
        );
      }
      // Return mock cookie for visitor system
      if (url.includes("genvisitor")) {
        return Promise.resolve(
          new Response(
            'window.gen_callback && gen_callback({"retcode":20000000,"msg":"succ","data":{"tid":"mock_tid"}});',
            { headers: { "Content-Type": "text/html" } },
          ),
        );
      }
      if (url.includes("visitor/visitor")) {
        return Promise.resolve(
          new Response(
            'window.cross_domain && cross_domain({"retcode":20000000,"msg":"succ","data":{"sub":"mock_sub","subp":"mock_subp"}});',
            { headers: { "Content-Type": "text/html" } },
          ),
        );
      }
      // statuses/show API
      if (url.includes("statuses/show")) {
        return Promise.resolve(new Response(JSON.stringify(fixtureData)));
      }
      // statuses/extend for long text
      if (url.includes("statuses/extend")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              ok: 1,
              data: { longTextContent: "Long text content" },
            }),
          ),
        );
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    try {
      const status = await getStatusInfo("5303880858734627");

      expect(status).toBeDefined();
      if (status) {
        expect(status.id).toBe("5303880858734627");
        expect(status.author.name).toBe("崩坏星穹铁道");
        expect(status.videoUrl).toContain("f.video.weibocdn.com");
        expect(status.videoTitle).toContain("千冶");
        expect(status.playCount).toBe("28万次播放");
        expect(status.stat.attitudes).toBe(8991);
        expect(status.bid).toBe("R1CXrAEh5");
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
