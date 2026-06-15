export class WeiboApiError extends Error {
  code: number;
  data: any;

  constructor(message: string, code: number, data?: any) {
    super(message);
    this.name = "WeiboApiError";
    this.code = code;
    this.data = data;
  }
}
