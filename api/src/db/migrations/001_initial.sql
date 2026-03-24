-- 用户表：
-- 保存账号基础信息和密码哈希。
-- 这里不保存任何会话状态，让账号与登录态分层管理。
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 会话表：
-- 持久化登录会话，只保存 token 哈希而不保存明文 token，
-- 以降低数据库泄露时的凭证风险。
CREATE TABLE IF NOT EXISTS auth_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  last_seen_at TEXT,
  -- 用户删除时同步清理会话，避免遗留悬空登录态。
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 食物记录表：
-- 只保存成功识别后的结构化结果。
-- 对于需要重拍的拒答场景，接口直接返回建议，不会写入这张表。
CREATE TABLE IF NOT EXISTS food_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  image_path TEXT NOT NULL,
  recognized_name TEXT NOT NULL,
  portion_description TEXT NOT NULL,
  calories_kcal REAL NOT NULL,
  protein_grams REAL NOT NULL,
  carbs_grams REAL NOT NULL,
  fat_grams REAL NOT NULL,
  confidence_label TEXT NOT NULL,
  confidence_reason TEXT NOT NULL,
  estimate_disclaimer TEXT NOT NULL,
  retry_recommended INTEGER NOT NULL DEFAULT 0,
  retry_reason TEXT,
  analysis_status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  -- 用户删除时同步清理历史记录，确保所有数据都遵守用户边界。
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
