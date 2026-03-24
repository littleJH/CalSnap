import { z } from "zod";

/**
 * 成功识别时必须返回完整营养结构，
 * 这样结果页和历史详情页都可以直接复用同一份数据。
 */
const successSchema = z.object({
  foodName: z.string().min(1),
  portionDescription: z.string().min(1),
  caloriesKcal: z.number().nonnegative(),
  proteinGrams: z.number().nonnegative(),
  carbsGrams: z.number().nonnegative(),
  fatGrams: z.number().nonnegative(),
  confidenceLabel: z.enum(["high", "medium", "low"]),
  confidenceReason: z.string().min(1),
  estimateDisclaimer: z.string().min(1),
  retryRecommended: z.literal(false),
  retryReason: z.string().nullable(),
});

/**
 * 不支持分析的场景只允许返回低置信度与重拍建议，
 * 防止模型在信息不足时虚构营养值。
 */
const retrySchema = z.object({
  confidenceLabel: z.literal("low"),
  confidenceReason: z.string().min(1),
  estimateDisclaimer: z.string().min(1),
  retryRecommended: z.literal(true),
  retryReason: z.string().min(1),
});

export const analysisResultSchema = z.union([successSchema, retrySchema]);

/**
 * Structured Outputs 要求顶层 schema 必须是 object。
 * 因此这里给模型下发一份“字段齐全、可空表示不适用”的宽松结构，
 * 再在本地使用更严格的 union schema 做最终业务校验。
 */
const modelOutputSchema = z.object({
  foodName: z.string().min(1).nullable(),
  portionDescription: z.string().min(1).nullable(),
  caloriesKcal: z.number().nonnegative().nullable(),
  proteinGrams: z.number().nonnegative().nullable(),
  carbsGrams: z.number().nonnegative().nullable(),
  fatGrams: z.number().nonnegative().nullable(),
  confidenceLabel: z.enum(["high", "medium", "low"]),
  confidenceReason: z.string().min(1),
  estimateDisclaimer: z.string().min(1),
  retryRecommended: z.boolean(),
  retryReason: z.string().min(1).nullable(),
});

export const analysisResultJsonSchema = z.toJSONSchema(modelOutputSchema);

export type AnalysisResult = z.infer<typeof analysisResultSchema>;

/**
 * 在外部服务边界统一做解析。
 * 这样 service 层拿到的永远是强类型、已校验的数据结构。
 */
export function validateAnalysisResult(payload: unknown) {
  return analysisResultSchema.parse(payload);
}
