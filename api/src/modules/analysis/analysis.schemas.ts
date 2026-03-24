import { z } from "zod";

/**
 * 成功分析响应的契约。
 * 返回完整的识别结果以及已落库的 `recordId`，
 * 方便前端在展示结果的同时立即关联到历史记录。
 */
export const analysisSuccessSchema = z.object({
  status: z.literal("succeeded"),
  recordId: z.string().min(1),
  result: z.object({
    foodName: z.string(),
    portionDescription: z.string(),
    caloriesKcal: z.number(),
    proteinGrams: z.number(),
    carbsGrams: z.number(),
    fatGrams: z.number(),
    confidenceLabel: z.enum(["high", "medium", "low"]),
    confidenceReason: z.string(),
    estimateDisclaimer: z.string(),
    retryRecommended: z.literal(false),
    retryReason: z.string().nullable(),
  }),
});

/**
 * 需要重拍时的响应契约。
 * 这里显式区分“拒答但给出建议”和“成功识别”，
 * 让客户端无需猜测返回值含义。
 */
export const analysisRetrySchema = z.object({
  status: z.literal("needs_retry"),
  result: z.object({
    confidenceLabel: z.literal("low"),
    confidenceReason: z.string(),
    estimateDisclaimer: z.string(),
    retryRecommended: z.literal(true),
    retryReason: z.string(),
  }),
});
