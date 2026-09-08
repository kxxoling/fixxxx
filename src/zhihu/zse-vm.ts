/**
 * 知乎 x-zse-96 签名 VM。
 *
 * 这是 www.zhihu.com 上 `x-zse-96` 请求签名的字节码 VM 签名器。
 * 下面的解释器（class `l`、密码器 `__g`）提取自知乎的混淆 web 包；
 * VM_SOURCE 末尾的 base64 数据块携带 S 盒/轮密钥
 * （`window.__ZH__.zse` 里的 `zb`/`zk`/`zm`）和 `_encrypt` 子程序。
 * 已验证与 2026-09 线上包的常量和执行轨迹一致。
 *
 * 算法概要（已对照真实 Chrome 验证）：
 *   x-zse-93 = "101_3_3.0"
 *   签名原文 = [x-zse-93, path+search, d_c0, body?, x-zst-81?].filter(Boolean).join("+")
 *   x-zse-96 = "2.0_" + _encrypt(md5(签名原文))
 *   _encrypt = 自定义字母表( 随机IV(16字节) || cfbd分组密码(pkcs7(md5hex.slice(14)), IV) )
 *
 * VM 内含反爬环境检测（webdriver 标记、canvas、
 * Function.prototype.toString 等），下面的 shim 无需 jsdom 即可骗过它们，
 * 因此本模块可以直接跑在 Bun 和边缘运行时（Vercel Edge）。
 * 若知乎轮换了密钥表，需要从其前端包重新提取 VM_SOURCE。
 */
import { VM_SOURCE } from "./vm-source";

const g = globalThis as unknown as Record<string, any>;

function installVmShims(target: Record<string, any>): void {
  if (typeof target.window === "undefined") target.window = target;
  if (typeof target.self === "undefined") target.self = target;
  if (typeof target.navigator === "undefined" || !target.navigator) {
    target.navigator = {
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      platform: "MacIntel",
      language: "zh-CN",
      languages: ["zh-CN"],
      plugins: [],
      mimeTypes: [],
    };
  }
  if (typeof target.location === "undefined" || !target.location) {
    target.location = {
      href: "https://www.zhihu.com/",
      protocol: "https:",
      host: "www.zhihu.com",
      hostname: "www.zhihu.com",
      pathname: "/",
      origin: "https://www.zhihu.com",
      toString(): string {
        return "https://www.zhihu.com/";
      },
    };
  }
  if (typeof target.history === "undefined" || !target.history) {
    target.history = { length: 1 };
  }
  if (typeof target.screen === "undefined" || !target.screen) {
    target.screen = { width: 1920, height: 1080, colorDepth: 24 };
  }
  if (typeof target.document === "undefined" || !target.document) {
    target.document = {
      toString(): string {
        return "[object HTMLDocument]";
      },
      createElement(tag: string) {
        if (tag === "canvas") {
          return {
            getContext: () => ({
              toString: () => "[object CanvasRenderingContext2D]",
            }),
          };
        }
        return {};
      },
      getElementById: () => null,
      getElementsByClassName: () => [],
    };
  }
  if (typeof target.alert === "undefined") {
    target.alert = () => {};
  }
}

installVmShims(g);

// VM 会把 __g 和 window.__ZH__.zse 挂到全局对象上。
// 必须用间接 eval：VM 里的 "undefined" != typeof window 检查要求全局作用域，
// 而 import 进来的 VM_SOURCE 是字符串，只能在这里执行；
// 源码本身逐字节提取自知乎线上包，不存在注入面。
// biome-ignore lint/complexity/noCommaOperator: 间接 eval 的标准写法就是 (0, eval)
// biome-ignore lint/security/noGlobalEval: 见上，知乎 VM 必须在全局作用域执行
(0, eval)(VM_SOURCE);

const vmCipher = g.__g as { _encrypt: (input: string) => string };

if (!vmCipher || typeof vmCipher._encrypt !== "function") {
  throw new Error("知乎 zse VM 初始化失败");
}

/**
 * 对 md5 十六进制摘要执行 VM 的 encrypt 程序。
 * 输出内嵌随机 IV，因此相同输入每次产出不同（但均有效）的签名。
 */
export function zseEncrypt(md5Hex: string): string {
  return vmCipher._encrypt(md5Hex);
}
