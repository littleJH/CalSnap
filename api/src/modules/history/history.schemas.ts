import { z } from "zod";

/**
 * 历史列表项只返回概览字段，
 * 以便客户端快速渲染列表而不必加载完整详情。
 */
export const historyListItemSchema = z.object({
  id: z.string(),
  foodName: z.string(),
  portionDescription: z.string(),
  caloriesKcal: z.number(),
  confidenceLabel: z.enum(["high", "medium", "low"]),
  createdAt: z.string(),
});

/**
 * 历史详情返回完整字段，
 * 供详情页直接展示营养值、置信度说明和图片路径。
 */
export const historyDetailSchema = z.object({
  id: z.string(),
  foodName: z.string(),
  portionDescription: z.string(),
  caloriesKcal: z.number(),
  proteinGrams: z.number(),
  carbsGrams: z.number(),
  fatGrams: z.number(),
  confidenceLabel: z.enum(["high", "medium", "low"]),
  confidenceReason: z.string(),
  estimateDisclaimer: z.string(),
  imageUrl: z.string().nullable(),
  createdAt: z.string(),
});
