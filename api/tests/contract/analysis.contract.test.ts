import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 模拟 PackyCode 成功识别单一食物的返回值。
 * 这个 mock 用于验证接口在“正常分析成功”时的响应结构和落库分支。
 */
function mockPackyCodeSuccess() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        foodName: "Apple",
        portionDescription: "1 medium apple",
        caloriesKcal: 95,
        proteinGrams: 0.5,
        carbsGrams: 25,
        fatGrams: 0.3,
        confidenceLabel: "high",
        confidenceReason: "Single clear item",
        estimateDisclaimer: "Estimated values for reference only.",
        retryRecommended: false,
        retryReason: null,
      }),
    }),
  );
}

/**
 * 模拟 PackyCode 判断当前图片不适合估算，需要用户重拍。
 * 这个 mock 用于验证接口的“拒答但给建议”分支。
 */
function mockPackyCodeRetry() {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        confidenceLabel: "low",
        confidenceReason: "Multiple main foods visible",
        estimateDisclaimer: "Estimated values for reference only.",
        retryRecommended: true,
        retryReason: "Please retake with one main item.",
      }),
    }),
  );
}

/**
 * 每次测试都重新加载 app 模块，确保读取到当前测试设置的环境变量。
 */
async function buildApp() {
  vi.resetModules();
  const mod = await import("../../src/app.js");
  return mod.createApp();
}

/**
 * 先注册一个测试用户，再返回后续分析接口要用的 token。
 */
async function registerAndToken(app: Awaited<ReturnType<typeof buildApp>>) {
  const response = await request(app).post("/auth/register").send({
    email: "demo@example.com",
    password: "supersecret",
  });

  return response.body.token as string;
}

describe("analysis contract", () => {
  let tempRoot: string;

  beforeEach(async () => {
    // 为每个用例创建独立的数据库和上传目录，避免状态互相污染。
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-analysis-"));
    process.env.DATABASE_PATH = path.join(tempRoot, "calsnap.db");
    process.env.UPLOAD_DIR = path.join(tempRoot, "uploads");

    // 分析测试除了数据库目录，还要补上 PackyCode 相关环境变量。
    process.env.PACKYCODE_BASE_URL = "https://relay.example.com";
    process.env.PACKYCODE_API_KEY = "secret";
    process.env.PACKYCODE_MODEL = "demo-model";
    process.env.SESSION_TOKEN_BYTES = "16";
    process.env.SESSION_TTL_DAYS = "7";
  });

  test("analysis returns a structured success result", async () => {
    mockPackyCodeSuccess();
    const app = await buildApp();
    const token = await registerAndToken(app);

    // 上传内容本身不重要，关键是验证接口是否返回了规范的成功结构。
    const response = await request(app)
      .post("/analysis")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("image-bytes"), "apple.jpg");

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("succeeded");
    expect(response.body.recordId).toEqual(expect.any(String));
    expect(response.body.result.foodName).toBe("Apple");
    expect(response.body.result.retryRecommended).toBe(false);
  });

  test("analysis returns retry guidance for unsupported scenes", async () => {
    mockPackyCodeRetry();
    const app = await buildApp();
    const token = await registerAndToken(app);

    const response = await request(app)
      .post("/analysis")
      .set("Authorization", `Bearer ${token}`)
      .attach("image", Buffer.from("image-bytes"), "meal.jpg");

    // 这里既要确认 HTTP 成功返回，也要确认业务状态明确标记为需要重拍。
    expect(response.status).toBe(200);
    expect(response.body.status).toBe("needs_retry");
    expect(response.body.result.retryRecommended).toBe(true);
    expect(response.body.result.retryReason).toMatch(/retake/i);
  });
});
