import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * 记录测试开始前的环境变量快照。
 * 每个用例结束后都要把这几项恢复回去，避免影响其他测试模块。
 */
const originalEnv = {
  PACKYCODE_BASE_URL: process.env.PACKYCODE_BASE_URL,
  PACKYCODE_API_KEY: process.env.PACKYCODE_API_KEY,
  PACKYCODE_MODEL: process.env.PACKYCODE_MODEL,
};

afterEach(() => {
  // 重新加载模块前先清空缓存，确保下一次 import 会重新读取环境变量。
  vi.resetModules();

  if (originalEnv.PACKYCODE_BASE_URL === undefined) {
    delete process.env.PACKYCODE_BASE_URL;
  } else {
    process.env.PACKYCODE_BASE_URL = originalEnv.PACKYCODE_BASE_URL;
  }

  if (originalEnv.PACKYCODE_API_KEY === undefined) {
    delete process.env.PACKYCODE_API_KEY;
  } else {
    process.env.PACKYCODE_API_KEY = originalEnv.PACKYCODE_API_KEY;
  }

  if (originalEnv.PACKYCODE_MODEL === undefined) {
    delete process.env.PACKYCODE_MODEL;
  } else {
    process.env.PACKYCODE_MODEL = originalEnv.PACKYCODE_MODEL;
  }
});

describe("env config", () => {
  test("loads PackyCode settings from the project .env file", async () => {
    // 显式清空进程变量，验证模块确实会从 `.env` 文件回填默认配置。
    delete process.env.PACKYCODE_BASE_URL;
    delete process.env.PACKYCODE_API_KEY;
    delete process.env.PACKYCODE_MODEL;

    const mod = await import("../../src/config/env.js");

    expect(mod.env.PACKYCODE_BASE_URL).toBe("https://www.packyapi.com/v1");
    expect(mod.env.PACKYCODE_API_KEY).toBe("sk-0yS5ihZC1POZNiSfNQnGeC2ZYmyLRGd5QoeUwCcxx6Ra6M0U");
    expect(mod.env.PACKYCODE_MODEL).toBe("gpt-5.4");
  });
});
