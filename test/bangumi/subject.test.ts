import { describe, expect, mock, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getSubjectInfo } from "@/bangumi/subject";

describe("Bangumi Subject Logic", () => {
  test("fetches and parses subject info from fixture", async () => {
    const fixturePath = join(
      process.cwd(),
      "test/bangumi/fixtures/subject-514358.json",
    );
    const fixtureData = JSON.parse(readFileSync(fixturePath, "utf-8"));

    const originalFetch = global.fetch;
    global.fetch = mock((url: string) => {
      if (url.includes("api.bgm.tv/v0/subjects/514358")) {
        return Promise.resolve(new Response(JSON.stringify(fixtureData)));
      }
      return Promise.reject(new Error(`Unhandled fetch URL: ${url}`));
    }) as unknown as typeof global.fetch;

    try {
      const subject = await getSubjectInfo("514358");

      expect(subject).toBeDefined();
      if (subject) {
        expect(subject.id).toBe(514358);
        expect(subject.name).toBe("CITY THE ANIMATION");
        expect(subject.nameCn).toBe("小城日常");
        expect(subject.rating.score).toBe(7.5);
        expect(subject.rating.rank).toBe(823);
        expect(subject.tags.length).toBeGreaterThan(0);
        expect(subject.cover).toContain("lain.bgm.tv");
        expect(subject.url).toBe("https://bgm.tv/subject/514358");
        expect(subject.collection.wish).toBeGreaterThan(0);
      }
    } finally {
      global.fetch = originalFetch;
    }
  });

  test("returns null for non-existent subject", async () => {
    const originalFetch = global.fetch;
    global.fetch = mock(() =>
      Promise.resolve(new Response("Not Found", { status: 404 })),
    ) as unknown as typeof global.fetch;

    try {
      const subject = await getSubjectInfo("999999999");
      expect(subject).toBeNull();
    } finally {
      global.fetch = originalFetch;
    }
  });
});
