import { describe, expect, test } from "bun:test";
import type { BangumiSubjectInfo } from "@/bangumi/subject";
import { renderSubjectPage } from "@/bangumi/render";

describe("Bangumi Render Logic", () => {
  test("renders subject page with correct metadata", () => {
    const mockSubject: BangumiSubjectInfo = {
      id: 514358,
      name: "CITY THE ANIMATION",
      nameCn: "小城日常",
      summary: "この街、ただの街にあらず。",
      cover: "https://lain.bgm.tv/pic/cover/l/b2/c2/514358_oRoZH.jpg",
      date: "2025-07-06",
      platform: "TV",
      type: 2,
      totalEpisodes: 13,
      rating: {
        rank: 823,
        score: 7.5,
        total: 8160,
        count: {
          "1": 24,
          "2": 12,
          "3": 18,
          "4": 82,
          "5": 227,
          "6": 830,
          "7": 2460,
          "8": 3196,
          "9": 958,
          "10": 353,
        },
      },
      collection: {
        wish: 4359,
        collect: 10037,
        doing: 6509,
        onHold: 1123,
        dropped: 784,
      },
      tags: [
        { name: "京阿尼", count: 2611 },
        { name: "日常", count: 2275 },
      ],
      infobox: [
        { key: "中文名", value: "小城日常" },
        { key: "话数", value: "13" },
      ],
      url: "https://bgm.tv/subject/514358",
    };

    const html = renderSubjectPage(mockSubject);

    expect(html).toContain("Bangumi Instant View");
    expect(html).toContain("小城日常");
    expect(html).toContain("CITY THE ANIMATION");
    expect(html).toContain("7.5");
    expect(html).toContain("#823");
    expect(html).toContain("京阿尼");
    expect(html).toContain("bgm.tv/subject/514358");
    expect(html).toContain("动画");
    expect(html).toContain("2025-07-06");
  });

  test("renders subject page with minimal data", () => {
    const mockSubject: BangumiSubjectInfo = {
      id: 12345,
      name: "Test",
      nameCn: "",
      summary: "",
      cover: "",
      date: "",
      platform: "",
      type: 0,
      totalEpisodes: 0,
      rating: { rank: 0, score: 0, total: 0, count: {} },
      collection: { wish: 0, collect: 0, doing: 0, onHold: 0, dropped: 0 },
      tags: [],
      infobox: [],
      url: "https://bgm.tv/subject/12345",
    };

    const html = renderSubjectPage(mockSubject);

    expect(html).toContain("Test");
    expect(html).toContain("bgm.tv/subject/12345");
    expect(html).not.toContain("评分");
    expect(html).not.toContain("标签");
  });

  test("renders infobox with array values missing k field", () => {
    const mockSubject: BangumiSubjectInfo = {
      id: 221062,
      name: "PERSONA5 the Animation",
      nameCn: "女神异闻录5",
      summary: "test",
      cover: "https://lain.bgm.tv/pic/cover/l/e9/da/221062_UxRu1.jpg",
      date: "2018-04-07",
      platform: "TV",
      type: 2,
      totalEpisodes: 26,
      rating: {
        rank: 7638,
        score: 6,
        total: 3230,
        count: { "6": 1186, "7": 808 },
      },
      collection: {
        wish: 894,
        collect: 4784,
        doing: 729,
        onHold: 562,
        dropped: 677,
      },
      tags: [{ name: "游戏改", count: 982 }],
      infobox: [
        { key: "中文名", value: "女神异闻录5" },
        { key: "别名", value: [{ v: "P5A" }] },
        { key: "话数", value: "26" },
      ],
      url: "https://bgm.tv/subject/221062",
    };

    const html = renderSubjectPage(mockSubject);

    expect(html).toContain("女神异闻录5");
    expect(html).toContain("P5A");
    expect(html).not.toContain("undefined");
    expect(html).toContain("6.0");
  });
});
