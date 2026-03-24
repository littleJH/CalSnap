import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/api/api_client.dart";
import "../../../core/auth/session_store.dart";

/// 认证仓库提供者。
///
/// 这里把接口调用与本地会话持久化封装成统一能力，
/// 页面和控制器无需同时关心网络层与存储层细节。
final authRepositoryProvider = Provider<AuthRepository>((ref) {
  return ApiAuthRepository(
    apiClient: ref.watch(apiClientProvider),
    sessionStore: ref.watch(sessionStoreProvider),
  );
});

/// 认证相关能力的抽象接口。
abstract class AuthRepository {
  /// 恢复本地缓存的会话。
  Future<AuthSession?> restoreSession();

  /// 使用邮箱和密码登录。
  Future<AuthSession> signIn({required String email, required String password});

  /// 使用邮箱和密码注册。
  Future<AuthSession> signUp({required String email, required String password});

  /// 退出当前登录状态。
  Future<void> logout();
}

/// 面向后端 API 的认证仓库实现。
class ApiAuthRepository implements AuthRepository {
  ApiAuthRepository({
    required ApiClient apiClient,
    required SessionStore sessionStore,
  }) : _apiClient = apiClient,
       _sessionStore = sessionStore;

  final ApiClient _apiClient;
  final SessionStore _sessionStore;

  @override
  Future<AuthSession?> restoreSession() async {
    // 应用启动时优先恢复本地 token，并同步回 API 客户端默认请求头，
    // 这样后续受保护接口不需要重新手动注入认证信息。
    final session = await _sessionStore.readSession();
    _apiClient.setAuthToken(session?.token);
    return session;
  }

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    final payload = await _apiClient.postJson(
      "/auth/login",
      body: {"email": email, "password": password},
    );

    return _storeSession(payload);
  }

  @override
  Future<AuthSession> signUp({
    required String email,
    required String password,
  }) async {
    final payload = await _apiClient.postJson(
      "/auth/register",
      body: {"email": email, "password": password},
    );

    return _storeSession(payload);
  }

  @override
  Future<void> logout() async {
    try {
      await _apiClient.postJson("/auth/logout");
    } finally {
      // 即使服务端退出接口失败，也要优先清空本地登录态，
      // 避免客户端继续带着过期凭证工作。
      _apiClient.setAuthToken(null);
      await _sessionStore.clearSession();
    }
  }

  /// 持久化登录或注册成功后返回的最新会话。
  ///
  /// 所有成功路径都收敛到这里，确保请求头和本地缓存的更新方式完全一致。
  Future<AuthSession> _storeSession(Map<String, dynamic> payload) async {
    final session = AuthSession.fromJson(payload);
    _apiClient.setAuthToken(session.token);
    await _sessionStore.writeSession(session);
    return session;
  }
}
