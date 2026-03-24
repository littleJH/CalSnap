import "dart:convert";

import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_secure_storage/flutter_secure_storage.dart";

/// 会话持久化能力的默认提供者。
///
/// 当前实现基于安全存储，后续如果需要替换存储介质或在测试中注入假实现，
/// 上层只需要覆盖这个 Provider 即可。
final sessionStoreProvider = Provider<SessionStore>((ref) {
  return SecureSessionStore(const FlutterSecureStorage());
});

/// 已登录用户的最小信息。
///
/// 该模型与后端返回结构保持一致，便于直接序列化、反序列化和本地持久化。
class AuthUser {
  const AuthUser({required this.id, required this.email});

  final String id;
  final String email;

  /// 把用户信息转换成可持久化的 JSON 结构。
  Map<String, dynamic> toJson() => {"id": id, "email": email};

  /// 从服务端或本地缓存恢复用户信息。
  factory AuthUser.fromJson(Map<String, dynamic> json) {
    return AuthUser(id: json["id"] as String, email: json["email"] as String);
  }
}

/// 当前会话的数据模型。
///
/// 它同时包含访问令牌和用户信息，便于应用重启后直接恢复到已登录状态。
class AuthSession {
  const AuthSession({required this.token, required this.user});

  final String token;
  final AuthUser user;

  /// 把会话转换成可写入本地存储的 JSON 结构。
  Map<String, dynamic> toJson() => {"token": token, "user": user.toJson()};

  /// 从 JSON 恢复会话对象。
  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      token: json["token"] as String,
      user: AuthUser.fromJson(json["user"] as Map<String, dynamic>),
    );
  }
}

/// 会话持久化接口。
///
/// 仓库和控制器只依赖这个抽象，不关心底层到底是安全存储、内存还是测试假对象。
abstract class SessionStore {
  /// 读取当前已保存的会话，没有内容时返回 `null`。
  Future<AuthSession?> readSession();

  /// 持久化最新会话。
  Future<void> writeSession(AuthSession session);

  /// 清空本地会话。
  Future<void> clearSession();
}

/// 基于 `FlutterSecureStorage` 的会话存储实现。
class SecureSessionStore implements SessionStore {
  SecureSessionStore(this._storage);

  static const _sessionKey = "calsnap.auth.session";

  final FlutterSecureStorage _storage;

  @override
  Future<AuthSession?> readSession() async {
    // 没有存储内容时直接返回空值，让上层明确判断为未登录状态。
    final raw = await _storage.read(key: _sessionKey);
    if (raw == null || raw.isEmpty) {
      return null;
    }

    return AuthSession.fromJson(jsonDecode(raw) as Map<String, dynamic>);
  }

  @override
  Future<void> writeSession(AuthSession session) async {
    await _storage.write(key: _sessionKey, value: jsonEncode(session.toJson()));
  }

  @override
  Future<void> clearSession() {
    return _storage.delete(key: _sessionKey);
  }
}
