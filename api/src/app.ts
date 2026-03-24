import express from "express";

import { createDbClient } from "./db/client.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createAnalysisRouter } from "./modules/analysis/analysis.routes.js";
import { createAnalysisService } from "./modules/analysis/analysis.service.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createAuthService } from "./modules/auth/auth.service.js";
import { createHistoryRouter } from "./modules/history/history.routes.js";
import { createHistoryService } from "./modules/history/history.service.js";

/**
 * 统一装配整个 API 应用。
 * 这个入口只负责创建数据库连接、实例化服务和挂载路由，
 * 不承载具体业务逻辑，方便测试直接复用。
 */
export function createApp() {
  const app = express();

  // 当前 MVP 使用单个 SQLite 连接即可满足本地运行和测试场景。
  const db = createDbClient();
  const authService = createAuthService(db);
  const analysisService = createAnalysisService(db);
  const historyService = createHistoryService(db);

  // 通用 JSON 请求体统一在这里解析；文件上传由分析路由自行处理。
  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  // 路由按业务域拆分挂载，保持启动入口清晰而稳定。
  app.use("/auth", createAuthRouter(authService));
  app.use("/analysis", createAnalysisRouter(authService, analysisService));
  app.use("/history", createHistoryRouter(authService, historyService));

  // 错误处理中间件必须放在最后，才能接住前面所有路由抛出的异常。
  app.use(errorHandler);

  return app;
}
