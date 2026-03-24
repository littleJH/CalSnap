import type { DbClient } from "../../db/client.js";
import { notFound } from "../../shared/http-errors.js";

/**
 * 历史服务只依赖当前登录用户的核心字段。
 */
type CurrentUser = {
  id: string;
  email: string;
};

/**
 * 创建历史记录服务。
 * 所有数据库查询都以内层 `user_id` 过滤为安全边界，
 * 从根源上避免跨用户访问别人的历史记录。
 */
export function createHistoryService(db: DbClient) {
  const listStmt = db.prepare(
    `
    SELECT id, recognized_name, portion_description, calories_kcal, confidence_label, created_at
    FROM food_records
    WHERE user_id = ?
    ORDER BY created_at DESC
    `,
  );
  const detailStmt = db.prepare(
    `
    SELECT *
    FROM food_records
    WHERE id = ? AND user_id = ?
    `,
  );
  const deleteStmt = db.prepare(
    "DELETE FROM food_records WHERE id = ? AND user_id = ?",
  );

  return {
    list(user: CurrentUser) {
      const rows = listStmt.all(user.id) as Array<Record<string, unknown>>;

      // 在这里完成数据库字段到接口字段的映射，前端无需关心下划线命名。
      return rows.map((row) => ({
        id: String(row.id),
        foodName: String(row.recognized_name),
        portionDescription: String(row.portion_description),
        caloriesKcal: Number(row.calories_kcal),
        confidenceLabel: String(row.confidence_label),
        createdAt: String(row.created_at),
      }));
    },
    detail(user: CurrentUser, recordId: string) {
      const row = detailStmt.get(recordId, user.id) as Record<string, unknown> | undefined;
      if (!row) {
        // 未命中既可能是记录不存在，也可能是当前用户无权访问；统一返回 404。
        throw notFound("Record not found");
      }

      return {
        id: String(row.id),
        foodName: String(row.recognized_name),
        portionDescription: String(row.portion_description),
        caloriesKcal: Number(row.calories_kcal),
        proteinGrams: Number(row.protein_grams),
        carbsGrams: Number(row.carbs_grams),
        fatGrams: Number(row.fat_grams),
        confidenceLabel: String(row.confidence_label),
        confidenceReason: String(row.confidence_reason),
        estimateDisclaimer: String(row.estimate_disclaimer),
        imageUrl: String(row.image_path),
        createdAt: String(row.created_at),
      };
    },
    delete(user: CurrentUser, recordId: string) {
      const result = deleteStmt.run(recordId, user.id);

      // 删除结果为 0 时同样不暴露资源真实状态，统一返回 404。
      if (result.changes === 0) {
        throw notFound("Record not found");
      }
    },
  };
}
