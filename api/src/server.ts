import { createApp } from "./app.js";
import { env } from "./config/env.js";

/**
 * 真实的进程入口。
 * 测试直接复用 `createApp()`，只有本地开发或生产启动时才在这里监听端口。
 */
const app = createApp();

app.listen(env.PORT, () => {
  console.log(`CalSnap API listening on ${env.PORT}`);
});
