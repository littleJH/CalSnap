import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * 当前项目按顺序维护迁移文件名列表。
 * 现阶段只有初始化 SQL，一旦后续扩展表结构，
 * 只需要继续在这里按顺序追加新文件名。
 */
export const migrationFiles = ["001_initial.sql"];

/**
 * 从磁盘读取迁移 SQL 文本。
 * 让 SQL 保持为独立文件而不是硬编码在 TypeScript 里，
 * 更便于审查、维护，也更接近真实项目中的迁移组织方式。
 */
export function loadSchemaStatements() {
  return migrationFiles.map((fileName) =>
    fs.readFileSync(path.join(moduleDir, "migrations", fileName), "utf8"),
  );
}
