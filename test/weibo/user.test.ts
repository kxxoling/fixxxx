import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getUserInfo } from "@/weibo/user";

describe("Weibo User Logic", () => {
  test("fetches and parses user info and recent statuses from fixtures", async () => {
    const userFixturePath = join(
      process.cwd(),
      "test/weibo/fixtures/user-7643376782.json",
    );
    const userFixtureData = JSON.parse(readFileSync(userFixturePath, "utf-8"));

    const feedFixturePath = join(
      process.cwd(),
      "test/weibo/fixtures/feed-7643376782.json",
    );
    const feedFixtureData = JSON.parse(readFileSync(feedFixturePath, "utf-8"));

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
      // User profile API (type=uid)
      if (url.includes("type=uid")) {
        return Promise.resolve(new Response(JSON.stringify(userFixtureData)));
      }
      // Feed API (containerid=107603)
      if (url.includes("containerid=107603")) {
        return Promise.resolve(new Response(JSON.stringify(feedFixtureData)));
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
    });
    global.fetch = fetchMock as unknown as typeof global.fetch;

    try {
      const user = await getUserInfo("7643376782");

      expect(user).toBeDefined();
      if (user) {
        expect(user.uid).toBe("7643376782");
        expect(user.name).toBeDefined();
        expect(typeof user.followersCount).toBe("string");
        expect(user.verified).toBe(true);
        expect(user.verifiedReason).toBeDefined();

        // Verify pinned statuses were separated from recent
        expect(user.pinnedStatuses).toBeDefined();
        expect(user.pinnedStatuses.length).toBe(2);
        expect(user.pinnedStatuses[0].bid).toBe("R1CXrAEh5");

        // Verify recent statuses (non-pinned)
        expect(user.recentStatuses).toBeDefined();
        expect(Array.isArray(user.recentStatuses)).toBe(true);
        expect(user.recentStatuses.length).toBe(1);

        const first = user.recentStatuses[0];
        expect(first.attitudes).toBeGreaterThan(0);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
