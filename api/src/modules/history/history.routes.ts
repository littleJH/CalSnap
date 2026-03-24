import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import type { createAuthService } from "../auth/auth.service.js";
import type { createHistoryService } from "./history.service.js";

type AuthService = ReturnType<typeof createAuthService>;
type HistoryService = ReturnType<typeof createHistoryService>;

/**
 * 创建历史记录路由。
 * 全部接口都依赖 `requireAuth`，用户上下文统一从 `response.locals` 读取，
 * 避免客户端自行传 userId 之类的高风险参数。
 */
export function createHistoryRouter(
  authService: AuthService,
  historyService: HistoryService,
) {
  const router = Router();

  router.get("/", requireAuth(authService), (_request, response) => {
    response.json({
      items: historyService.list(response.locals.currentUser),
    });
  });

  router.get("/:recordId", requireAuth(authService), (request, response) => {
    response.json(
      historyService.detail(
        response.locals.currentUser,
        String(request.params.recordId),
      ),
    );
  });

  router.delete("/:recordId", requireAuth(authService), (request, response) => {
    historyService.delete(
      response.locals.currentUser,
      String(request.params.recordId),
    );
    response.status(204).send();
  });

  return router;
}
