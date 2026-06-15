import { describe, expect, mock, test } from "bun:test";
import type { WeiboStatusInfo } from "@/weibo/status";
import type { WeiboUserInfo } from "@/weibo/user";
import { renderStatusPage, renderUserPage } from "@/weibo/render";

function mockImageFetch() {
  const originalFetch = global.fetch;
  global.fetch = mock((url: string) => {
    if (typeof url === "string" && url.includes("sinaimg.cn")) {
      // Return a tiny 1x1 JPEG for image requests
      const jpeg = Buffer.from(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYI4Q/SFhSRFEiO0NVJjFFRkZUKjdDYWIzR2R1Y2UVFhcmQ0VERUZHRkpLTE1OT1BRUlNUVVZXWFlaW1xdXl9gYWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXp7fH1+f4CBgoOEhYaHiImKi4yNjo+QkZKTlJWWl5iZmpucnZ6foKGio6SlpqeoqaqrrK2ur7CxsrO0tba3uLm6u7y9vr/AwcLDxMXGx8jJysvMzc7P0NHS09TV1tfY2drb3N3e3+Dh4uPk5ebn6Onq6+zt7u/w8fLz9PX29/j5+vv8/f7/2gAMAwEAAhEDEQA/AD8//9k=",
        "base64",
      );
      return Promise.resolve(
        new Response(jpeg, {
          headers: { "Content-Type": "image/jpeg" },
        }),
      );
    }
    return originalFetch(url);
  }) as unknown as typeof global.fetch;
  return () => {
    global.fetch = originalFetch;
  };
}

describe("Weibo Render Logic", () => {
  test("renders status page with correct metadata", async () => {
    const mockStatus: WeiboStatusInfo = {
      id: "123456",
      textHtml: "<p>测试微博内容</p>",
      images: [],
      videoUrl: "https://example.com/video.mp4",
      videoTitle: "测试视频",
      videoPoster: null,
      playCount: "100次播放",
      author: {
        name: "TestUser",
        avatar: "https://example.com/avatar.jpg",
        profileUrl: "https://m.weibo.cn/u/123",
      },
      stat: { reposts: 10, comments: 5, attitudes: 100 },
      created_at: "Mon Jan 01 12:00:00 +0800 2026",
      bid: "abc123",
      source: '<a href="#">微博客户端</a>',
      isLongText: false,
      longTextContent: null,
    };

    const html = await renderStatusPage(mockStatus);

    expect(html).toContain("Weibo Instant View");
    expect(html).toContain("测试视频");
    expect(html).toContain("TestUser");
    expect(html).toContain("https://example.com/video.mp4");
    expect(html).toContain("weibo.com/detail/abc123");
  });

  test("renders status page without video", async () => {
    const cleanup = mockImageFetch();
    const mockStatus: WeiboStatusInfo = {
      id: "789",
      textHtml: "<p>纯文字微博</p>",
      images: ["https://tvax1.sinaimg.cn/test/pic.jpg"],
      videoUrl: null,
      videoTitle: null,
      videoPoster: null,
      playCount: null,
      author: {
        name: "Writer",
        avatar: "https://example.com/face.jpg",
        profileUrl: "https://m.weibo.cn/u/789",
      },
      stat: { reposts: 0, comments: 0, attitudes: 1 },
      created_at: "Tue Feb 02 10:00:00 +0800 2026",
      bid: "xyz",
      source: null,
      isLongText: false,
      longTextContent: null,
    };

    const html = await renderStatusPage(mockStatus);

    expect(html).toContain("纯文字微博");
    expect(html).toContain("data:image");
    expect(html).not.toContain("<video");
    cleanup();
  });

  test("renders user page with cover, avatar and recent statuses", async () => {
    const cleanup = mockImageFetch();
    const mockUser: WeiboUserInfo = {
      uid: "7643376782",
      name: "崩坏星穹铁道",
      description: "",
      avatar: "https://tvax1.sinaimg.cn/avatar.jpg",
      avatarHd: "https://wx1.sinaimg.cn/avatar_hd.jpg",
      profileUrl: "https://m.weibo.cn/u/7643376782",
      followersCount: "453.3万",
      followCount: 37,
      statusesCount: 3473,
      gender: "f",
      verified: true,
      verifiedReason: "官方账号",
      coverImage: "https://wx2.sinaimg.cn/cover.jpg",
      pinnedStatuses: [
        {
          id: "5303880858734627",
          textHtml: "千冶•刃角色PV——「灭度」",
          createdAt: "Fri May 29 12:00:01 +0800 2026",
          bid: "R1CXrAEh5",
          reposts: 4357,
          comments: 1181,
          attitudes: 8991,
          coverImage: "https://wx1.sinaimg.cn/video_cover.jpg",
          videoTitle: "千冶•刃角色PV——「灭度」",
        },
      ],
      recentStatuses: [
        {
          id: "5301463683170767",
          textHtml: "4.3版本PV：「沉于生者的忘川」",
          createdAt: "Fri May 22 19:55:00 +0800 2026",
          bid: "R0C4MdiRp",
          reposts: 3142,
          comments: 547,
          attitudes: 3647,
          coverImage: "https://wx1.sinaimg.cn/video_cover2.jpg",
          videoTitle: "4.3版本PV",
        },
      ],
    };

    const html = await renderUserPage(mockUser);

    expect(html).toContain("Weibo Instant View");
    expect(html).toContain("崩坏星穹铁道");
    expect(html).toContain("453.3万");
    expect(html).toContain("官方账号");
    expect(html).toContain("3473");
    expect(html).toContain("weibo.com/u/7643376782");
    expect(html).toContain("background-image: url('data:image");
    expect(html).toContain("近期微博");
    expect(html).toContain("千冶•刃角色PV");
    expect(html).toContain("R1CXrAEh5");
    expect(html).toContain("置顶微博");
    expect(html).toContain("4.3版本PV");
    expect(html).toContain("R0C4MdiRp");
    cleanup();
  });

  test("renders user page with empty statuses", async () => {
    const mockUser: WeiboUserInfo = {
      uid: "123",
      name: "NewUser",
      description: "新用户",
      avatar: "https://example.com/avatar.jpg",
      avatarHd: "https://example.com/avatar_hd.jpg",
      profileUrl: "https://m.weibo.cn/u/123",
      followersCount: "0",
      followCount: 0,
      statusesCount: 0,
      gender: "n",
      verified: false,
      verifiedReason: null,
      coverImage: null,
      pinnedStatuses: [],
      recentStatuses: [],
    };

    const html = await renderUserPage(mockUser);

    expect(html).toContain("NewUser");
    expect(html).toContain("暂无微博");
    expect(html).toContain("linear-gradient");
  });
});
