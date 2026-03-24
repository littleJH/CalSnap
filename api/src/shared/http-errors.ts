/**
 * 统一的 HTTP 业务异常类型。
 * 除了标准错误消息外，还显式携带状态码和“是否适合重试”的语义，
 * 方便中间件把业务错误稳定转换成接口响应。
 */
export class HttpError extends Error {
  statusCode: number;
  retryable: boolean;

  constructor(statusCode: number, message: string, retryable = false) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

/**
 * 下面这些工厂函数用于封装常见 HTTP 错误场景。
 * 业务代码只要表达语义，不需要在各处手写状态码。
 */
export function badRequest(message: string, retryable = false) {
  return new HttpError(400, message, retryable);
}

export function unauthorized(message = "Authentication required") {
  return new HttpError(401, message);
}

export function forbidden(message = "Forbidden") {
  return new HttpError(403, message);
}

export function notFound(message = "Not found") {
  return new HttpError(404, message);
}

export function conflict(message: string) {
  return new HttpError(409, message);
}

export function serviceUnavailable(message: string, retryable = true) {
  return new HttpError(503, message, retryable);
}
