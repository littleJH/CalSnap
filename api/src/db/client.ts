import fs from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { env } from "../config/env.js";
import { loadSchemaStatements } from "./schema.js";

/**
 * 对外暴露数据库客户端类型，方便 service 层和测试层复用同一套签名。
 */
export type DbClient = Database.Database;

/**
 * 先确保数据库文件所在目录存在。
 * 否则第一次启动时即使 SQL 本身正确，也会因为路径不存在而直接失败。
 */
function ensureDatabasePath(filePath: string) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

/**
 * 创建 SQLite 连接，并在连接建立后立即执行全部迁移 SQL。
 * 当前项目规模较小，启动即迁移的方式足够简单可靠，
 * 也能让测试每次拿到一致的表结构。
 */
export function createDbClient(databasePath = env.DATABASE_PATH): DbClient {
  ensureDatabasePath(databasePath);
  const db = new Database(databasePath);

  // SQLite 默认不会自动打开外键约束，这里显式开启，
  // 才能让用户删除时的级联清理真正生效。
  db.pragma("foreign_keys = ON");

  // 依次执行所有迁移语句，保证数据库在应用装配前就处于可用状态。
  for (const statement of loadSchemaStatements()) {
    db.exec(statement);
  }

  return db;
}
