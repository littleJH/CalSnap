import crypto from "node:crypto";

import bcrypt from "bcrypt";
import { nanoid } from "nanoid";

import { env } from "../../config/env.js";
import type { DbClient } from "../../db/client.js";
import { conflict, unauthorized } from "../../shared/http-errors.js";

/**
 * 与 `users` 表结构对应的行类型。
 * service 内部直接操作数据库字段命名，路由层不感知这些细节。
 */
type UserRow = {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
};

/**
 * 与 `auth_sessions` 表结构对应的行类型。
 */
type SessionRow = {
  id: string;
  user_id: string;
  token_hash: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  last_seen_at: string | null;
};

/**
 * 统一生成数据库里使用的 ISO 时间戳。
 */
function nowIso() {
  return new Date().toISOString();
}

/**
 * 标准化邮箱，避免大小写和首尾空格导致的重复账号判断失真。
 */
function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

/**
 * 只在数据库里保存 token 的哈希值，而不保存明文 token，
 * 这样即使数据库泄露，也不会直接暴露登录凭证。
 */
function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * 根据配置计算会话过期时间。
 */
function sessionExpiryIso() {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.SESSION_TTL_DAYS);
  return expiresAt.toISOString();
}

/**
 * 创建认证服务。
 * 它封装注册、登录、token 解析和登出失效等核心账号逻辑。
 */
export function createAuthService(db: DbClient) {
  const findUserByEmailStmt = db.prepare<[string], UserRow>(
    "SELECT * FROM users WHERE email = ?",
  );
  const insertUserStmt = db.prepare(
    "INSERT INTO users (id, email, password_hash, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  );
  const insertSessionStmt = db.prepare(
    "INSERT INTO auth_sessions (id, user_id, token_hash, created_at, expires_at, revoked_at, last_seen_at) VALUES (?, ?, ?, ?, ?, NULL, ?)",
  );
  const findSessionStmt = db.prepare<[string], SessionRow>(
    "SELECT * FROM auth_sessions WHERE token_hash = ?",
  );
  const findUserByIdStmt = db.prepare<[string], UserRow>(
    "SELECT * FROM users WHERE id = ?",
  );
  const revokeSessionStmt = db.prepare(
    "UPDATE auth_sessions SET revoked_at = ?, last_seen_at = ? WHERE id = ?",
  );
  const touchSessionStmt = db.prepare(
    "UPDATE auth_sessions SET last_seen_at = ? WHERE id = ?",
  );

  /**
   * 为指定用户创建新会话并返回明文 token。
   * 明文 token 只在这一刻返回给客户端，对内仅保存哈希值。
   */
  async function createSession(userId: string) {
    const token = crypto.randomBytes(env.SESSION_TOKEN_BYTES).toString("hex");
    const createdAt = nowIso();
    const sessionId = nanoid();

    insertSessionStmt.run(
      sessionId,
      userId,
      tokenHash(token),
      createdAt,
      sessionExpiryIso(),
      createdAt,
    );

    return token;
  }

  return {
    async register(email: string, password: string) {
      const normalizedEmail = normalizeEmail(email);
      const existing = findUserByEmailStmt.get(normalizedEmail);

      // 邮箱冲突在进入密码哈希之前就提前拦截，减少不必要计算。
      if (existing) {
        throw conflict("Email already exists");
      }

      const timestamp = nowIso();
      const userId = nanoid();

      // 密码永远只以 bcrypt 哈希形式落库，不保存明文。
      const passwordHash = await bcrypt.hash(password, 10);

      insertUserStmt.run(userId, normalizedEmail, passwordHash, timestamp, timestamp);

      // 注册成功后立即创建会话，减少前端额外登录一步。
      const token = await createSession(userId);

      return {
        token,
        user: {
          id: userId,
          email: normalizedEmail,
        },
      };
    },
    async login(email: string, password: string) {
      const user = findUserByEmailStmt.get(normalizeEmail(email));

      // 只要账号不存在或密码不匹配，都返回统一的鉴权失败信息。
      if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        throw unauthorized("Invalid email or password");
      }

      const token = await createSession(user.id);
      return {
        token,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    },
    findUserFromToken(token: string) {
      // 先校验会话本身，再根据 user_id 反查用户，确保吊销和过期逻辑全部生效。
      const session = findSessionStmt.get(tokenHash(token));
      if (!session || session.revoked_at) {
        throw unauthorized();
      }

      if (new Date(session.expires_at).getTime() <= Date.now()) {
        throw unauthorized("Session expired");
      }

      const user = findUserByIdStmt.get(session.user_id);
      if (!user) {
        throw unauthorized();
      }

      // 每次成功鉴权都刷新最后活跃时间，为未来会话管理预留依据。
      touchSessionStmt.run(nowIso(), session.id);
      return {
        sessionId: session.id,
        user: {
          id: user.id,
          email: user.email,
        },
      };
    },
    logout(token: string) {
      const session = findSessionStmt.get(tokenHash(token));

      // 已吊销或不存在的会话统一视为未登录，避免暴露过多状态细节。
      if (!session || session.revoked_at) {
        throw unauthorized();
      }

      const timestamp = nowIso();
      revokeSessionStmt.run(timestamp, timestamp, session.id);
    },
  };
}
