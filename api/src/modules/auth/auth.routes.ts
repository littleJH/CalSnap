import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import type { createAuthService } from "./auth.service.js";
import { loginSchema, registerSchema } from "./auth.schemas.js";

type AuthService = ReturnType<typeof createAuthService>;

/**
 * 创建认证相关路由。
 * 路由层只负责请求体校验、调用 service 和组装 HTTP 响应，
 * 具体账号规则与会话策略全部交由 service 层维护。
 */
export function createAuthRouter(authService: AuthService) {
  const router = Router();

  router.post("/register", async (request, response, next) => {
    try {
      // 注册接口严格按 schema 校验邮箱和密码格式。
      const input = registerSchema.parse(request.body);
      const result = await authService.register(input.email, input.password);
      response.status(201).json(result);
    } catch (error) {
      next(error);
    }
  });

  router.post("/login", async (request, response, next) => {
    try {
      // 登录与注册沿用同一套字段约束，避免接口规则漂移。
      const input = loginSchema.parse(request.body);
      const result = await authService.login(input.email, input.password);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  router.get("/me", requireAuth(authService), (_request, response) => {
    // 当前用户信息已经由 requireAuth 解析并挂到 response.locals。
    response.json(response.locals.currentUser);
  });

  router.post("/logout", requireAuth(authService), (request, response, next) => {
    try {
      // 这里复用鉴权头里的原始 token，让 service 完成会话吊销。
      const token = request.header("Authorization")!.slice("Bearer ".length);
      authService.logout(token);
      response.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  return router;
}
