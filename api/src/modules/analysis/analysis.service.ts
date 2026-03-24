import { nanoid } from "nanoid";

import type { DbClient } from "../../db/client.js";
import { analyzeImageWithPackyCode } from "../../lib/packycode/client.js";
import type { AnalysisResult } from "../../lib/packycode/validate-result.js";
import { saveUpload } from "../../lib/storage.js";

/**
 * service 层内部只依赖当前登录用户的核心字段。
 * 这里单独声明类型，是为了让分析逻辑不依赖完整路由上下文。
 */
type CurrentUser = {
  id: string;
  email: string;
};

/**
 * 统一生成数据库里使用的 ISO 时间戳。
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 创建图片分析服务。
 * 这个服务串起“保存上传文件 -> 调用 PackyCode -> 根据结果决定是否入库”的完整链路。
 */
export function createAnalysisService(db: DbClient) {
  const insertRecordStmt = db.prepare(
    `
    INSERT INTO food_records (
      id, user_id, image_path, recognized_name, portion_description, calories_kcal,
      protein_grams, carbs_grams, fat_grams, confidence_label, confidence_reason,
      estimate_disclaimer, retry_recommended, retry_reason, analysis_status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
  );

  return {
    async analyze(user: CurrentUser, file: Express.Multer.File) {
      // 先落盘，给外部模型调用提供稳定的本地图片路径。
      const stored = await saveUpload(file);

      // 图片保存成功后再调用外部分析服务，避免出现“模型需要文件，但文件尚未写入”的状态。
      const result = await analyzeImageWithPackyCode(stored.absolutePath);

      // 对于多食物、模糊图等不支持场景，只返回重拍建议，不写历史记录。
      if (result.retryRecommended) {
        return {
          status: "needs_retry" as const,
          result,
        };
      }

      // 只有成功识别的结构化结果才会真正持久化到 food_records。
      const recordId = nanoid();
      const timestamp = nowIso();

      insertRecordStmt.run(
        recordId,
        user.id,
        stored.relativePath,
        result.foodName,
        result.portionDescription,
        result.caloriesKcal,
        result.proteinGrams,
        result.carbsGrams,
        result.fatGrams,
        result.confidenceLabel,
        result.confidenceReason,
        result.estimateDisclaimer,
        0,
        result.retryReason,
        "succeeded",
        timestamp,
        timestamp,
      );

      return {
        status: "succeeded" as const,
        recordId,
        result,
      };
    },
  };
}
