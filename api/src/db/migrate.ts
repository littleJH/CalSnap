import { createDbClient } from "./client.js";

/**
 * 命令行迁移入口。
 * 当前版本没有独立迁移执行器，直接通过创建数据库连接触发建表逻辑，
 * 连接成功后再立即关闭即可。
 */
const db = createDbClient();
db.close();

console.log("Database migrations applied.");
