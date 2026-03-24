import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { createDbClient } from "../../src/db/client.js";

describe("database migrations", () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    // 用完即删临时目录，避免本机测试目录无限堆积。
    if (tempRoot) {
      await fs.rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  test("loads the initial SQL migration and creates the core tables", async () => {
    // 先确认迁移文件本身存在，再验证它确实能建出核心表。
    const migrationPath = path.resolve(
      process.cwd(),
      "src/db/migrations/001_initial.sql",
    );

    await expect(fs.access(migrationPath)).resolves.toBeUndefined();

    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-db-"));
    const dbPath = path.join(tempRoot, "calsnap.db");
    const db = createDbClient(dbPath);

    // 直接查询 sqlite_master，验证迁移执行后的真实建表结果。
    const tables = db
      .prepare(
        `
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('users', 'auth_sessions', 'food_records')
        ORDER BY name
        `,
      )
      .all() as Array<{ name: string }>;

    db.close();

    expect(tables).toEqual([
      { name: "auth_sessions" },
      { name: "food_records" },
      { name: "users" },
    ]);
  });
});
