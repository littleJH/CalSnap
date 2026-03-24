import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import request from "supertest";
import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 每次测试都重新加载 app 模块，确保读取到当前测试设置的环境变量。
 */
async function buildApp() {
  vi.resetModules();
  const mod = await import("../../src/app.js");
  return mod.createApp();
}

describe("auth contract", () => {
  let tempRoot: string;

  beforeEach(async () => {
    // 为每个测试创建独立的临时数据库和上传目录，避免状态互相污染。
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-auth-"));
    process.env.DATABASE_PATH = path.join(tempRoot, "calsnap.db");
    process.env.UPLOAD_DIR = path.join(tempRoot, "uploads");
    process.env.SESSION_TOKEN_BYTES = "16";
    process.env.SESSION_TTL_DAYS = "7";
  });

  test("register creates a session and returns the current user", async () => {
    const app = await buildApp();

    const register = await request(app).post("/auth/register").send({
      email: "demo@example.com",
      password: "supersecret",
    });

    expect(register.status).toBe(201);
    expect(register.body.user.email).toBe("demo@example.com");
    expect(register.body.token).toEqual(expect.any(String));

    // 注册成功后再访问 `/auth/me`，验证 token 确实能换回当前用户。
    const me = await request(app)
      .get("/auth/me")
      .set("Authorization", `Bearer ${register.body.token}`);

    expect(me.status).toBe(200);
    expect(me.body.email).toBe("demo@example.com");
  });

  test("login rejects invalid credentials", async () => {
    const app = await buildApp();

    // 先创建账号，再用错误密码登录，验证统一的鉴权失败行为。
    await request(app).post("/auth/register").send({
      email: "demo@example.com",
      password: "supersecret",
    });

    const login = await request(app).post("/auth/login").send({
      email: "demo@example.com",
      password: "wrong-password",
    });

    expect(login.status).toBe(401);
    expect(login.body.message).toMatch(/invalid/i);
  });
});
