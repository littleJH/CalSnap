import multer from "multer";
import { Router } from "express";

import { requireAuth } from "../../middleware/auth.js";
import { badRequest } from "../../shared/http-errors.js";
import type { createAnalysisService } from "./analysis.service.js";
import type { createAuthService } from "../auth/auth.service.js";

type AnalysisService = ReturnType<typeof createAnalysisService>;
type AuthService = ReturnType<typeof createAuthService>;

/**
 * 分析接口通过内存存储接收上传文件。
 * 文件真正落盘的时机放在 service 层统一处理，
 * 这样路由层只负责协议适配，不关心文件命名和存储细节。
 */
const upload = multer({ storage: multer.memoryStorage() });

/**
 * 创建食物分析路由。
 * 路由层只负责鉴权、参数校验和响应输出，
 * 具体的图片保存、模型调用与结果入库都交给 service 层。
 */
export function createAnalysisRouter(
  authService: AuthService,
  analysisService: AnalysisService,
) {
  const router = Router();

  router.post(
    "/",
    requireAuth(authService),
    upload.single("image"),
    async (request, response, next) => {
      try {
        // 该接口要求客户端必须提交名为 `image` 的单张图片。
        if (!request.file) {
          throw badRequest("Image file is required");
        }

        const result = await analysisService.analyze(
          response.locals.currentUser,
          request.file,
        );

        response.json(result);
      } catch (error) {
        // 分析过程中抛出的所有异常都交给统一错误处理中间件。
        next(error);
      }
    },
  );

  return router;
}
