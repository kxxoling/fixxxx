export class ZhihuApiError extends Error {
  code: number | string;
  detail?: unknown;

  constructor(message: string, code: number | string, detail?: unknown) {
    super(message);
    this.name = "ZhihuApiError";
    this.code = code;
    this.detail = detail;
  }
}
