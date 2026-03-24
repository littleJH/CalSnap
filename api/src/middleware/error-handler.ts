import type { NextFunction, Request, Response } from "express";

import { HttpError } from "../shared/http-errors.js";

/**
 * 全局错误处理中间件。
 * 已知业务异常按约定返回状态码和可重试信息；
 * 未知异常统一降级为 500，避免把内部实现细节泄露给客户端。
 */
export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  // 已经被业务层包装过的异常，直接透传约定好的响应结构。
  if (error instanceof HttpError) {
    response.status(error.statusCode).json({
      message: error.message,
      retryable: error.retryable,
    });
    return;
  }

  // 未知错误保留到服务端日志中，便于定位，但不回传具体堆栈。
  console.error(error);
  response.status(500).json({
    message: "Unexpected server error",
    retryable: false,
  });
}
