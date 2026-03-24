import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 该集成测试重点覆盖“删除动作的所有权约束”。
 * 因此这里固定使用会成功落库的分析结果，避免把关注点分散到模型拒答分支。
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
 * 重新创建应用实例，确保每个用例都读取自己的环境变量和临时数据库。
 */
async function buildApp() {
  vi.resetModules();
  const mod = await import("../../src/app.js");
  return mod.createApp();
}

/**
 * 注册指定邮箱用户并创建一条历史记录，
 * 方便后续验证删除接口的所有权逻辑。
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

describe("history delete authorization", () => {
  let tempRoot: string;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-delete-"));
    process.env.DATABASE_PATH = path.join(tempRoot, "calsnap.db");
    process.env.UPLOAD_DIR = path.join(tempRoot, "uploads");
    process.env.PACKYCODE_BASE_URL = "https://relay.example.com";
    process.env.PACKYCODE_API_KEY = "secret";
    process.env.PACKYCODE_MODEL = "demo-model";
    process.env.SESSION_TOKEN_BYTES = "16";
    process.env.SESSION_TTL_DAYS = "7";
  });

  test("deleting another user's record is denied and owner's delete succeeds", async () => {
    const app = await buildApp();
    const owner = await createRecord(app, "owner@example.com");
    const intruder = await createRecord(app, "intruder@example.com");

    // 非所有者尝试删除时，接口不暴露资源存在性，统一返回 404。
    const forbiddenDelete = await request(app)
      .delete(`/history/${owner.recordId}`)
      .set("Authorization", `Bearer ${intruder.token}`);

    expect(forbiddenDelete.status).toBe(404);

    // 所有者删除成功后，原记录也应无法再次访问。
    const ownerDelete = await request(app)
      .delete(`/history/${owner.recordId}`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(ownerDelete.status).toBe(204);

    const missingAfterDelete = await request(app)
      .get(`/history/${owner.recordId}`)
      .set("Authorization", `Bearer ${owner.token}`);

    expect(missingAfterDelete.status).toBe(404);
  });
});
