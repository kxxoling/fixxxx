import { describe, expect, test } from "bun:test";
import { md5Hex } from "@/zhihu/md5";
import { buildSignatureSource, buildXZse96, X_ZSE_93 } from "@/zhihu/signature";

const DC0 = "ABCDdG1lc3RfdGMwAAAAAAAAAP0=|1700000000";
const ALPHABET =
  "6fpLRqJO8M/c3jnYxFkUVC4ZIG12SiH=5v0mXDazWBTsuw7QetbKdoPyAl+hN9rgE";

describe("知乎 MD5", () => {
  test("符合 RFC 1321 测试向量", () => {
    expect(md5Hex("")).toBe("d41d8cd98f00b204e9800998ecf8427e");
    expect(md5Hex("abc")).toBe("900150983cd24fb0d6963f7d28e17f72");
    expect(md5Hex("message digest")).toBe("f96b697d7cb7938d525a2f31aaf161d0");
  });

  test("处理 utf-8 输入", () => {
    expect(md5Hex("中文")).toHaveLength(32);
  });
});

describe("知乎签名原文", () => {
  test("版本号、路径、dc0 用加号连接", () => {
    const path = "/api/v4/questions/19550227?include=detail,visit_count";
    expect(buildSignatureSource(path, DC0)).toBe(`${X_ZSE_93}+${path}+${DC0}`);
  });

  test("剔除空片段", () => {
    expect(buildSignatureSource("/p", "d")).toBe(`${X_ZSE_93}+/p+d`);
  });

  test("提供时包含 x-zst-81", () => {
    expect(buildSignatureSource("/p", "d", "st81")).toBe(
      `${X_ZSE_93}+/p+d+st81`,
    );
  });
});

describe("知乎 x-zse-96", () => {
  test("2.0_ 前缀 + 密码字母表 64 字符", () => {
    const sig = buildXZse96("/api/v4/articles/123", DC0);
    expect(sig.startsWith("2.0_")).toBe(true);
    const body = sig.slice(4);
    expect(body).toHaveLength(64);
    for (const ch of body) {
      expect(ALPHABET).toContain(ch);
    }
  });

  test("内嵌随机 IV，重复签名结果不同", () => {
    const a = buildXZse96("/api/v4/articles/123", DC0);
    const b = buildXZse96("/api/v4/articles/123", DC0);
    expect(a).not.toBe(b);
  });
});
