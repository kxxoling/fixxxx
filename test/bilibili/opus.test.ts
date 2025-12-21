import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseOpusResponse } from "@/bilibili/opus";

describe("Parser Logic - Opus", () => {
  test("parses opus response using fixture data", () => {
    const fixturePath = join(
      process.cwd(),
      "test/bilibili/fixtures/opus-1056353752004427792.json",
    );
    const fixtureData = JSON.parse(readFileSync(fixturePath, "utf-8"));

    // Based on typical Bilibili response structure: data.data.item
    // We verify if the fixture has this structure
    const item = fixtureData.data?.item;

    expect(item).toBeDefined();

    const info = parseOpusResponse(item);

    expect(info.id).toBeDefined();
    expect(info.title).toBeDefined();
    expect(info.author.name).toBeDefined();

    // Check for stats presence and types
    expect(typeof info.stat.like).toBe("number");
    expect(typeof info.stat.reply).toBe("number");
    expect(typeof info.stat.coin).toBe("number");
  });
});
