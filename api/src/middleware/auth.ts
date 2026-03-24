import type { NextFunction, Request, Response } from "express";

import type { createAuthService } from "../modules/auth/auth.service.js";
import { unauthorized } from "../shared/http-errors.js";

type AuthService = ReturnType<typeof createAuthService>;

/**
 * 认证中间件。
 * 它负责读取 `Authorization: Bearer <token>` 头，
 * 通过认证服务解析当前会话，再把当前用户和会话标识挂到 `response.locals`。
 */
export function requireAuth(authService: AuthService) {
  return (request: Request, response: Response, next: NextFunction) => {
    const rawHeader = request.header("Authorization");

    // 缺失 Bearer Token 时直接按未登录处理，后续业务逻辑不再继续执行。
    if (!rawHeader?.startsWith("Bearer ")) {
      next(unauthorized());
      return;
    }

    try {
      // 认证服务统一负责 token 解析、过期判断和吊销校验。
      const resolved = authService.findUserFromToken(rawHeader.slice("Bearer ".length));
      response.locals.currentUser = resolved.user;
      response.locals.sessionId = resolved.sessionId;
      next();
    } catch (error) {
      // 解析失败统一交给全局错误处理中间件输出标准化响应。
      next(error);
    }
  };
}
