# CalSnap README（最新代码版）

> 目标读者：计算机科班、主要做前端、后端经验较少的工程师。
> 本文档分为两部分：
>
> 1. **架构设计说明**（为什么这么分层、数据怎么流动、关键边界在哪里）
> 2. **使用操作手册**（如何本地跑起来、如何联调、如何排查问题）

---

## 1. 项目概览

CalSnap 是一个食物热量识别 MVP，核心流程：

1. 用户注册/登录（邮箱 + 密码）
2. 上传一张食物图片（单主对象）
3. 服务端调用多模态模型估算热量和宏量营养素
4. 成功结果写入历史记录
5. 用户可查看/删除自己的历史记录

### 1.1 当前实现状态（以最新代码为准）

- ✅ 后端认证（注册/登录/会话/登出）
- ✅ 后端分析链路（上传 -> 调模型 -> 结果校验 -> 入库）
- ✅ 后端历史 API（列表/详情/删除，按用户隔离）
- ✅ Flutter 登录与分析流程（可跑通）
- ⚠️ Flutter 历史页目前是占位页（后端已可用，前端待接入）

---

## 2. 技术栈

### 2.1 后端（`api/`）

- Node.js + TypeScript（ESM）
- Express 5
- SQLite（better-sqlite3）
- zod（请求/返回结构校验）
- bcrypt（密码哈希）
- multer（图片上传）

### 2.2 移动端（`mobile/`）

- Flutter / Dart 3
- flutter_riverpod（状态管理）
- go_router（路由守卫）
- dio（HTTP 客户端）
- flutter_secure_storage（会话持久化）
- image_picker（拍照/相册）

---

## 3. 仓库结构（Monorepo）

```text
CalSnap/
├─ api/
│  ├─ src/
│  │  ├─ app.ts                 # 应用装配入口（路由/服务/中间件）
│  │  ├─ server.ts              # 进程入口（监听端口）
│  │  ├─ config/env.ts          # 环境变量读取与默认值
│  │  ├─ db/
│  │  │  ├─ client.ts           # SQLite 客户端
│  │  │  ├─ schema.ts           # 迁移文件加载
│  │  │  ├─ migrate.ts          # 迁移命令入口
│  │  │  └─ migrations/001_initial.sql
│  │  ├─ middleware/
│  │  │  ├─ auth.ts             # Bearer 认证中间件
│  │  │  └─ error-handler.ts    # 全局错误处理中间件
│  │  ├─ modules/
│  │  │  ├─ auth/               # 注册/登录/会话/登出
│  │  │  ├─ analysis/           # 图片分析业务
│  │  │  └─ history/            # 历史记录业务
│  │  ├─ lib/
│  │  │  ├─ storage.ts          # 上传文件本地落盘
│  │  │  └─ packycode/          # 模型调用与结果校验
│  │  └─ shared/http-errors.ts  # 统一业务异常
│  ├─ tests/
│  │  ├─ contract/
│  │  └─ integration/
│  └─ package.json
│
├─ mobile/
│  ├─ lib/
│  │  ├─ app/                   # App 根组件与路由
│  │  ├─ core/                  # API 客户端/会话存储/UI 壳
│  │  └─ features/
│  │     ├─ auth/
│  │     └─ analysis/
│  ├─ test/
│  └─ integration_test/
│
└─ specs/001-food-calorie-mvp/
   ├─ spec.md
   ├─ data-model.md
   ├─ quickstart.md
   └─ contracts/api.yaml
```

---

## 4. 架构设计（详细）

## 4.1 系统全景

```text
Flutter App
   │  (JSON / multipart)
   ▼
Express API
   ├─ /auth
   ├─ /analysis
   └─ /history
   │
   ├─ SQLite（users/auth_sessions/food_records）
   ├─ 本地文件系统（上传图片）
   └─ PackyCode Relay（模型推理）
```

设计原则：

- **移动端只做交互和展示**，不持有模型密钥
- **后端负责业务边界和安全边界**（鉴权、权限、数据校验）
- **模型结果先校验再入库**，避免脏数据污染历史

---

## 4.2 后端分层与职责

后端按“路由层 -> 服务层 -> 基础设施层”组织：

1. 路由层（`*.routes.ts`）
   - 处理 HTTP 细节（参数、状态码、响应）
   - 调用 service，不承载核心业务判断

2. 服务层（`*.service.ts`）
   - 承载核心业务规则（例如：会话校验、结果是否入库、历史权限）

3. 基础设施层（`db/`, `lib/`, `middleware/`）
   - DB 连接与迁移
   - 文件存储
   - 模型调用
   - 认证与错误中间件

这与前端常见“Page -> Store/Controller -> API Client”的职责分离思路一致。

---

## 4.3 认证设计（Session Token）

实现位置：`src/modules/auth/auth.service.ts`

### 核心机制

- 登录/注册成功后，服务端生成随机 token（`crypto.randomBytes`）
- 数据库只保存 token 的 `sha256` 哈希（`token_hash`）
- 客户端后续请求通过 `Authorization: Bearer <token>` 传递
- 认证中间件 `requireAuth`：
  - 校验 Bearer 格式
  - token 哈希查 session
  - 判断 revoked/expired
  - 查 user 并挂到 `response.locals.currentUser`
- 登出：将 session 标记 `revoked_at`

### 为什么适合当前 MVP

- 会话可撤销，行为可追踪（`last_seen_at`）
- 逻辑比引入完整 JWT 体系更直观
- 对“前后端分离但服务端控状态”的场景友好

---

## 4.4 图片分析链路设计

实现位置：

- 路由：`src/modules/analysis/analysis.routes.ts`
- 服务：`src/modules/analysis/analysis.service.ts`
- 模型调用：`src/lib/packycode/client.ts`
- 结果校验：`src/lib/packycode/validate-result.ts`

### 请求进入后端后的完整流程

1. `requireAuth` 校验登录态
2. `multer.memoryStorage()` 接收 `image` 单文件
3. `saveUpload()` 将文件写入 `UPLOAD_DIR`
4. `analyzeImageWithPackyCode()` 调用模型
5. `validateAnalysisResult()` 做 zod 校验
6. 业务分支：
   - `retryRecommended=true`：返回 `needs_retry`，**不入库**
   - 否则：写入 `food_records`，返回 `succeeded + recordId`

### 新版模型调用细节（本次代码更新重点）

`packycode/client.ts` 中已升级为：

- 对 `PACKYCODE_BASE_URL` 自动补 `/responses` 路径
- 按图片扩展名推断 MIME（png/webp/gif/jpeg）
- 使用 `text.format = json_schema` 约束结构化输出
- 优先从 `output_text` / `output[].content[]` 提取文本 JSON
- 兼容 ```json 代码块``` 包裹格式
- 无法解析时统一抛 503（`Analysis service returned an unexpected format.`）

这套处理显著提高了“模型返回结构稳定性”。

---

## 4.5 历史记录与权限边界

实现位置：`src/modules/history/history.service.ts`

所有历史查询和删除都必须带 `user_id` 过滤：

- 列表：`WHERE user_id = ?`
- 详情：`WHERE id = ? AND user_id = ?`
- 删除：`DELETE ... WHERE id = ? AND user_id = ?`

安全效果：

- 知道别人的 recordId 也无法读取或删除
- 未命中统一 404，避免泄露资源存在性

---

## 4.6 错误处理策略

实现位置：

- `src/shared/http-errors.ts`
- `src/middleware/error-handler.ts`

### 规则

- 业务可预期错误：使用 `HttpError`（含状态码和 `retryable`）
- 未知错误：统一返回 500 + 通用文案

返回结构示例：

```json
{
  "message": "...",
  "retryable": false
}
```

前端可直接用 `message` 做提示，并依据 `retryable` 决定是否展示重试入口。

---

## 4.7 数据层设计（SQLite）

迁移文件：`src/db/migrations/001_initial.sql`

### 表结构

1. `users`
   - 用户账号

2. `auth_sessions`
   - 登录会话（token 哈希、过期、吊销）

3. `food_records`
   - 成功识别结果（食物名、份量、kcal、三大营养素、置信度等）

`createDbClient()` 启动时会自动执行迁移 SQL，并开启 `foreign_keys = ON`。

---

## 4.8 配置与环境变量加载

实现位置：`src/config/env.ts`

特性：

- 服务启动时会尝试从 `api/.env` 自动读取变量
- 测试场景里显式设置的 `process.env` 仍然有效
- 数值变量有默认值回退，降低本地启动门槛

关键变量：

- `PORT`
- `DATABASE_PATH`
- `UPLOAD_DIR`
- `PACKYCODE_BASE_URL`
- `PACKYCODE_API_KEY`
- `PACKYCODE_MODEL`
- `SESSION_TOKEN_BYTES`
- `SESSION_TTL_DAYS`

---

## 4.9 Flutter 端架构（当前实现）

### 认证

- `auth_repository.dart`：负责登录/注册/登出 + 本地会话存取
- `session_store.dart`：基于 `flutter_secure_storage` 持久化 token 与 user
- `auth_controller.dart`：统一管理认证状态（未登录/加载中/已登录）

### 路由守卫

- `app/router.dart`
- 启动先进入 `/loading`，恢复本地会话后跳转
- 未登录禁止访问 `/analysis`、`/history`

### 分析流程

- `analysis_controller.dart` 管理选图、提交、错误态、结果态
- `capture_page.dart` 选图并提交
- `result_page.dart` 同时处理成功与重拍两种结果

### 现状说明

- 历史页仍是 `_HistoryPlaceholderPage` 占位实现
- 后端历史 API 已就绪，前端可直接接入

---

## 5. API 使用说明

### 5.1 健康检查

- `GET /health`

### 5.2 认证接口

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`（需 Bearer）
- `POST /auth/logout`（需 Bearer）

### 5.3 分析接口

- `POST /analysis`（需 Bearer）
- Content-Type：`multipart/form-data`
- 文件字段名：`image`

响应有两种：

1. `status = "succeeded"`（含 `recordId` 和完整营养结果）
2. `status = "needs_retry"`（只返回重拍建议）

### 5.4 历史接口

- `GET /history`
- `GET /history/:recordId`
- `DELETE /history/:recordId`

---

## 6. 本地运行（操作手册）

## 6.1 前置环境

- Node.js（建议 LTS）
- npm
- Flutter stable
- Android Studio 或 Xcode（至少一个模拟器/设备）

## 6.2 配置 `api/.env`

在 `api/` 目录下创建 `.env`：

```env
PORT=3000
DATABASE_PATH=./data/calsnap.db
UPLOAD_DIR=./storage/uploads
PACKYCODE_BASE_URL=https://<your-relay-host>
PACKYCODE_API_KEY=<server-only-secret>
PACKYCODE_MODEL=<model-name>
SESSION_TOKEN_BYTES=32
SESSION_TTL_DAYS=7
```

> 注意：`PACKYCODE_API_KEY` 只能放服务端，不能进入移动端代码或仓库提交记录。

## 6.3 启动后端 API

```bash
cd api
npm install
npm run db:migrate
npm run dev
```

成功后会看到：

```text
CalSnap API listening on 3000
```

## 6.4 启动 Flutter

```bash
cd mobile
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

### `API_BASE_URL` 选择建议

- Android 模拟器：`http://10.0.2.2:3000`
- iOS 模拟器：`http://localhost:3000`
- 真机：`http://<你的电脑局域网IP>:3000`

> 虽然代码中有默认 baseUrl，但建议始终通过 `--dart-define` 显式传入，避免环境切换问题。

---

## 7. 联调示例（curl）

## 7.1 注册

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@example.com","password":"supersecret"}'
```

## 7.2 上传分析

```bash
curl -X POST http://localhost:3000/analysis \
  -H "Authorization: Bearer <token>" \
  -F "image=@/absolute/path/to/apple.jpg"
```

## 7.3 查询历史

```bash
curl http://localhost:3000/history \
  -H "Authorization: Bearer <token>"
```

---

## 8. 测试命令

## 8.1 后端

```bash
cd api
npm run test
npm run test:watch
npm run build
```

测试覆盖：

- auth contract
- analysis contract（成功/重拍）
- history contract（用户隔离）
- integration（删除权限、迁移可用性）

## 8.2 移动端

```bash
cd mobile
flutter test
flutter test integration_test/auth_analysis_flow_test.dart
```

---

## 9. 常见问题排查

### 9.1 `/analysis` 返回 503

优先检查：

1. `PACKYCODE_*` 环境变量是否齐全
2. `PACKYCODE_BASE_URL` 是否可访问
3. 上游是否返回了非预期结构（后端会做严格解析）

### 9.2 上传成功但历史没有新增

如果返回的是 `status=needs_retry`，属于“拒答重拍场景”，按设计不会入库。

### 9.3 移动端能进分析，历史页没有数据

当前移动端历史页还是占位页；请先用 curl/Postman 验证后端历史接口。

### 9.4 真机连不上本地 API

检查：

- 手机和电脑是否同局域网
- `API_BASE_URL` 是否使用电脑局域网 IP
- 本机防火墙是否放行 3000 端口

---

## 10. 对前端工程师的下一步建议

推荐按这个顺序继续迭代：

1. 接入 Flutter 历史列表页（`GET /history`）
2. 接入历史详情页（`GET /history/:recordId`）
3. 接入删除操作（`DELETE /history/:recordId`）
4. 在结果页增加“保存状态/跳转历史”体验优化
5. 增加请求日志与 traceId，方便跨端排查

---

## 11. 安全与工程实践提醒

- 不要把 `.env`、密钥、数据库文件提交到仓库
- API key 只保留在服务端
- 生产化前建议补充：
  - 限流（Rate Limit）
  - 结构化日志与监控
  - 上传文件大小与类型白名单
  - 更细粒度错误码体系

---

如果你希望，我可以在这个 README 的基础上继续补两份配套文档：

1. **前端接口字段对照表（含 TypeScript 类型草案）**
2. **Flutter 历史页接入实施清单（按文件级别拆解）**
