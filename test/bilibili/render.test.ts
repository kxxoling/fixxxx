import { describe, expect, test } from "bun:test";
import type { OpusInfo } from "@/bilibili/opus";
import {
  renderOpusPage,
  renderTimelinePage,
  renderVideoPage,
} from "@/bilibili/render";
import type { TimelineInfo } from "@/bilibili/timeline";
import type { Comment, VideoInfo } from "@/bilibili/video";

describe("Render Logic", () => {
  test("renders video page with correct metadata", () => {
    const mockVideo: VideoInfo = {
      bvid: "BV123",
      aid: 123,
      title: "Test Video",
      desc: "Test Description",
      pic: "http://example.com/pic.jpg",
      owner: { name: "TestUser", face: "http://example.com/face.jpg" },
      stat: { view: 100, danmaku: 10, reply: 5 },
      pubdate: 1234567890,
      pages: [{ cid: 1, page: 1, part: "Part 1", duration: 60 }],
    };
    const mockComments: Comment[] = [];

    const html = renderVideoPage(mockVideo, mockComments);

    expect(html).toContain("<title>Test Video</title>");
    expect(html).toContain('content="Test Video"');
    expect(html).toContain('content="http://example.com/pic.jpg"');
    expect(html).toContain("TestUser");
  });

  test("renders multi-video parts", () => {
    const mockVideo: VideoInfo = {
      bvid: "BV123",
      aid: 123,
      title: "Test Video",
      desc: "Test Description",
      pic: "http://example.com/pic.jpg",
      owner: { name: "TestUser", face: "http://example.com/face.jpg" },
      stat: { view: 100, danmaku: 10, reply: 5 },
      pubdate: 1234567890,
      pages: [
        { cid: 1, page: 1, part: "Part 1", duration: 60 },
        { cid: 2, page: 2, part: "Part 2", duration: 120 },
      ],
    };
    const mockComments: Comment[] = [];

    const html = renderVideoPage(mockVideo, mockComments);

    expect(html).toContain("Part 1");
    expect(html).toContain("Part 2");
    expect(html).toContain("(1:00)");
    expect(html).toContain("(2:00)");
  });

  test("renders video replies with bold name and no avatar", () => {
    const mockVideo: VideoInfo = {
      bvid: "BV123",
      aid: 123,
      title: "Test Video",
      desc: "Test Description",
      pic: "http://example.com/pic.jpg",
      owner: { name: "TestUser", face: "http://example.com/face.jpg" },
      stat: { view: 100, danmaku: 10, reply: 5 },
      pubdate: 1234567890,
      pages: [],
    };
    const mockComments: Comment[] = [
      {
        rpid: 1,
        member: { uname: "Commenter", avatar: "http://example.com/avatar.jpg" },
        content: { message: "Top comment" },
        like: 10,
        ctime: 1234567890,
        replies: [
          {
            rpid: 2,
            member: {
              uname: "Replier",
              avatar: "http://example.com/avatar2.jpg",
            },
            content: { message: "Reply message" },
            like: 5,
            ctime: 1234567891,
          },
        ],
      },
    ];

    const html = renderVideoPage(mockVideo, mockComments);

    expect(html).toContain("<b>Replier</b>: Reply message");
    expect(html).not.toContain('src="http://example.com/avatar2.jpg"');
  });
});

describe("Render Logic - Timeline & Opus", () => {
  test("renders timeline page", () => {
    const mockTimeline: TimelineInfo = {
      id: "123456",
      type: "DYNAMIC_TYPE_DRAW",
      author: { name: "Artist", face: "http://example.com/face.jpg" },
      content: {
        text: "My Art",
        images: ["http://example.com/art.jpg"],
      },
      stat: { view: 100, like: 50, reply: 10 },
      pubdate: 1234567890,
    };

    const html = renderTimelinePage(mockTimeline);

    expect(html).toContain("Artist's Dynamic");
    expect(html).toContain("My Art");
    expect(html).toContain('src="http://example.com/art.jpg"');
  });

  test("renders opus page with structured content and debug comments", () => {
    const mockOpus: OpusInfo = {
      id: "987654",
      title: "My Article",
      banner_url: "http://example.com/banner.jpg",
      summary: "Article Summary",
      content: [
        {
          para_type: 1,
          text: {
            nodes: [
              { type: "TEXT_NODE_TYPE_WORD", word: { words: "Hello World" } },
            ],
          },
        },
        {
          para_type: 2,
          pic: { pics: [{ url: "http://example.com/image.jpg" }] },
        },
      ],
      author: { name: "Writer", face: "http://example.com/face.jpg" },
      stat: { like: 100, reply: 20, coin: 10 },
      pubdate: 1234567890,
    };

    const html = renderOpusPage(mockOpus);

    expect(html).toContain("My Article");
    expect(html).toContain("Hello World");
    expect(html).toContain('src="http://example.com/image.jpg"');
    expect(html).toContain('<!-- {"para_type":1'); // Debug comment check
  });
});
