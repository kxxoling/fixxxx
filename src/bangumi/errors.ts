export class BangumiApiError extends Error {
  code: number;
  data?: unknown;

  constructor(message: string, code: number, data?: unknown) {
    super(message);
    this.name = "BangumiApiError";
    this.code = code;
    this.data = data;
  }
}
