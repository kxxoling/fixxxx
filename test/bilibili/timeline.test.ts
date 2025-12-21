import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTimelineInfo } from "@/bilibili/timeline";

describe("Timeline Logic", () => {
  test("fetches and parses timeline info from fixture", async () => {
    const fixturePath = join(
      process.cwd(),
      "test/bilibili/fixtures/timeline-1141736312467882000.json",
    );
    const fixtureData = JSON.parse(readFileSync(fixturePath, "utf-8"));

    // Mock global fetch
    const originalFetch = global.fetch;
    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify(fixtureData))),
    );

    try {
      const info = await getTimelineInfo("1141736312467882000");

      expect(info).toBeDefined();
      if (info) {
        expect(info.id).toBeDefined(); // The ID might vary if the fixture is generic, but here we used specific one
        expect(info.content.text).toBeDefined();
        expect(info.author.name).toBeDefined();
      }
    } finally {
      global.fetch = originalFetch;
    }
  });
});
