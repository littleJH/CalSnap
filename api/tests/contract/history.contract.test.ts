import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 历史测试建立在“成功识别后会落库”的前提上，
 * 因此统一复用成功识别的 PackyCode mock。
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
 * 每次测试都重新创建应用，确保读取到当前用例准备的环境变量。
 */
async function buildApp() {
  vi.resetModules();
  const mod = await import("../../src/app.js");
  return mod.createApp();
}

/**
 * 辅助函数：注册用户并创建一条历史记录，
 * 让后续鉴权与列表/详情测试可以专注在断言本身。
 */
async function createRecord(app: Awaited<ReturnType<typeof buildApp>>, email: string) {
  mockPackyCodeSuccess();
  const register = await request(app).post("/auth/register").send({
    email,
    password: "supersecret",
  });
  const token = register.body.token as string;

  const created = await request(app)
    .post("/analysis")
    .set("Authorization", `Bearer ${token}`)
    .attach("image", Buffer.from("image-bytes"), "apple.jpg");

  return { token, recordId: created.body.recordId as string };
}

describe("history contract", () => {
  let tempRoot: string;

  beforeEach(async () => {
    // 每个用例使用独立数据库与上传目录，确保不同用户数据不会互相串扰。
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-history-"));
    process.env.DATABASE_PATH = path.join(tempRoot, "calsnap.db");
    process.env.UPLOAD_DIR = path.join(tempRoot, "uploads");
    process.env.PACKYCODE_BASE_URL = "https://relay.example.com";
    process.env.PACKYCODE_API_KEY = "secret";
    process.env.PACKYCODE_MODEL = "demo-model";
    process.env.SESSION_TOKEN_BYTES = "16";
    process.env.SESSION_TTL_DAYS = "7";
  });

  test("history list and detail return only the current user's records", async () => {
    const app = await buildApp();
    const owned = await createRecord(app, "owner@example.com");
    await createRecord(app, "other@example.com");

    // 同时创建其他用户数据，验证列表与详情都只返回当前用户自己的记录。
    const list = await request(app)
      .get("/history")
      .set("Authorization", `Bearer ${owned.token}`);

    expect(list.status).toBe(200);
    expect(list.body.items).toHaveLength(1);
    expect(list.body.items[0].id).toBe(owned.recordId);

    const detail = await request(app)
      .get(`/history/${owned.recordId}`)
      .set("Authorization", `Bearer ${owned.token}`);

    expect(detail.status).toBe(200);
    expect(detail.body.id).toBe(owned.recordId);
    expect(detail.body.foodName).toBe("Apple");
  });
});
