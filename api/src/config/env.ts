import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 统一定位 API 项目根目录下的 `.env` 文件。
 * 这里不依赖当前工作目录，而是基于模块文件位置回溯，
 * 这样无论通过开发命令、测试还是直接运行编译产物启动，
 * 都能稳定读取到同一份环境变量配置。
 */
const envFilePath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../.env");

/**
 * 如果项目根目录存在 `.env`，就在进程启动早期加载它。
 * 测试里显式设置的 `process.env` 仍然优先，因此不会破坏测试隔离。
 */
if (existsSync(envFilePath)) {
  process.loadEnvFile(envFilePath);
}

/**
 * 读取数值型环境变量。
 * 如果变量缺失、为空或不是合法数字，就回退到默认值，
 * 这样可以降低本地开发和测试环境的配置门槛。
 */
function readNumber(name: string, fallback: number) {
  const value = process.env[name];
  if (!value) return fallback;

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * 集中导出运行时配置，避免业务代码在各处直接读取 `process.env`。
 * 这样既能统一默认值策略，也方便测试覆盖环境变量行为。
 */
export const env = {
  PORT: readNumber("PORT", 3000),
  DATABASE_PATH: process.env.DATABASE_PATH ?? "./data/calsnap.db",
  UPLOAD_DIR: process.env.UPLOAD_DIR ?? "./storage/uploads",
  PACKYCODE_BASE_URL: process.env.PACKYCODE_BASE_URL ?? "",
  PACKYCODE_API_KEY: process.env.PACKYCODE_API_KEY ?? "",
  PACKYCODE_MODEL: process.env.PACKYCODE_MODEL ?? "",
  SESSION_TOKEN_BYTES: readNumber("SESSION_TOKEN_BYTES", 32),
  SESSION_TTL_DAYS: readNumber("SESSION_TTL_DAYS", 7),
};
