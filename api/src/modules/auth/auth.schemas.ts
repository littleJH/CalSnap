import { z } from "zod";

/**
 * 注册接口的输入约束。
 * 当前最小规则是合法邮箱与至少 8 位密码。
 */
export const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

/**
 * 登录沿用注册的同一套字段约束，
 * 避免前后端对邮箱、密码格式的理解出现偏差。
 */
export const loginSchema = registerSchema;
