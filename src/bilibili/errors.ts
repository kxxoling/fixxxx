export class BilibiliApiError extends Error {
  code: number;
  data: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = "BilibiliApiError";
    this.code = code;
    this.data = data;
  }
}
