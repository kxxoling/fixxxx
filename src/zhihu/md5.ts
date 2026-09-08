/**
 * 内置的纯 TS MD5（RFC 1321），仅作为 x-zse-96 签名的中间步骤（非安全用途）。
 *
 * 为什么自己实现而不用第三方库 / 平台 API：
 * - WebCrypto 不提供 MD5（它早已被从安全哈希标准中除名），
 *   Bun 与 Vercel Edge 都只有 WebCrypto，没有 Node 的 crypto 库；
 * - 维护活跃的哈希库（如 @noble/hashes）出于安全考虑不提供 MD5；
 * - 仍提供 MD5 的 npm 包（js-md5、blueimp-md5 等）多年无人维护，
 *   为一个约 60 行的固定算法引入它们不划算；
 * - 纯 TS 无依赖，Docker（Bun）与 Vercel Edge 行为完全一致。
 *
 * 正确性由 test/zhihu/signature.test.ts 中的 RFC 1321 官方测试向量保证。
 */

function toUtf8Bytes(input: string): number[] {
  return Array.from(new TextEncoder().encode(input));
}

function rotl(x: number, c: number): number {
  return (x << c) | (x >>> (32 - c));
}

const S = [
  7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 5, 9, 14, 20, 5,
  9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11,
  16, 23, 4, 11, 16, 23, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15,
  21,
];

const K = new Int32Array(64);
for (let i = 0; i < 64; i++) {
  K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 2 ** 32);
}

export function md5Hex(input: string): string {
  const message = toUtf8Bytes(input);
  const bitLen = message.length * 8;

  message.push(0x80);
  while (message.length % 64 !== 56) {
    message.push(0);
  }
  // JS shift counts wrap mod 32, so use division for the high length bytes.
  for (let i = 0; i < 8; i++) {
    message.push(Math.floor(bitLen / 2 ** (8 * i)) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;

  for (let chunk = 0; chunk < message.length; chunk += 64) {
    const M = new Int32Array(16);
    for (let j = 0; j < 16; j++) {
      const o = chunk + j * 4;
      M[j] =
        message[o] |
        (message[o + 1] << 8) |
        (message[o + 2] << 16) |
        (message[o + 3] << 24);
    }

    let A = a0;
    let B = b0;
    let C = c0;
    let D = d0;

    for (let i = 0; i < 64; i++) {
      let F: number;
      let g: number;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      F = (F + A + K[i] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(F, S[i])) | 0;
    }

    a0 = (a0 + A) | 0;
    b0 = (b0 + B) | 0;
    c0 = (c0 + C) | 0;
    d0 = (d0 + D) | 0;
  }

  const out = [a0, b0, c0, d0]
    .map((word) =>
      [0, 8, 16, 24]
        .map((shift) => ((word >>> shift) & 0xff).toString(16).padStart(2, "0"))
        .join(""),
    )
    .join("");
  return out;
}
