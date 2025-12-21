import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getVideoInfo } from "@/bilibili/video";

describe("Video Logic", () => {
  test("fetches and parses video info from fixture", async () => {
    const fixturePath = join(
      process.cwd(),
      "test/bilibili/fixtures/video-BV1GJ411x7h7.json",
    );
    const fixtureData = JSON.parse(readFileSync(fixturePath, "utf-8"));

    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = mock((url: string) => {
      if (url.includes("spi")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              data: {
                b_3: "mock-b3-key",
              },
            }),
            { headers: { "Content-Type": "application/json" } },
          ),
        );
      }
      if (url.includes("nav")) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              code: 0,
              data: {
                wbi_img: {
                  img_url: "https://i0.hdslb.com/bfs/wbi/img.png",
                  sub_url: "https://i0.hdslb.com/bfs/wbi/sub.png",
                },
              },
            }),
            {
              headers: { "Content-Type": "application/json" },
            },
          ),
        );
      }
      if (url.includes("view")) {
        return Promise.resolve(new Response(JSON.stringify(fixtureData)));
      }
      // Fallback for any other requests if necessary, or throw an error
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
    });

    try {
      const info = await getVideoInfo("BV1GJ411x7h7");

      expect(info).toBeDefined();
      if (info) {
        expect(info.bvid).toBe("BV1GJ411x7h7");
        expect(info.title).toBeDefined();
        expect(info.stat.view).toBeGreaterThan(0);
        expect(info.pages.length).toBeGreaterThan(0);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
