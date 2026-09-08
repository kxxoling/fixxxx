import { md5Hex } from "./md5";
import { zseEncrypt } from "./zse-vm";

export const X_ZSE_93 = "101_3_3.0";

/**
 * 构造会被 MD5 再加密的签名原文，与 web 端的签名流程一致：
 * 各部分用 "+" 连接，空值剔除。body 和 x-zst-81 只在登录态 / POST
 * 请求中参与，游客 GET 一律不带。
 */
export function buildSignatureSource(
  pathWithQuery: string,
  dc0: string,
  xZst81?: string | null,
): string {
  return [X_ZSE_93, pathWithQuery, dc0, xZst81 || null]
    .filter(Boolean)
    .join("+");
}

/**
 * 计算 api/v4 请求的 x-zse-96 头。`pathWithQuery` 必须与请求 URL 的
 * pathname+search 逐字节一致，否则服务端会拒签。
 */
export function buildXZse96(
  pathWithQuery: string,
  dc0: string,
  xZst81?: string | null,
): string {
  const source = buildSignatureSource(pathWithQuery, dc0, xZst81);
  return `2.0_${zseEncrypt(md5Hex(source))}`;
}
