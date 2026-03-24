import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/auth/session_store.dart";
import "../data/auth_repository.dart";

/// 认证状态控制器。
///
/// 它把“当前是否存在会话”表示成 [AsyncValue]，这样路由层和页面层
/// 都能同时感知恢复中、已登录、未登录和异常四种状态。
final authControllerProvider =
    AsyncNotifierProvider<AuthController, AuthSession?>(AuthController.new);

/// 负责驱动登录、注册和登出状态流转的控制器。
class AuthController extends AsyncNotifier<AuthSession?> {
  @override
  Future<AuthSession?> build() {
    // Provider 初始化时立即尝试恢复本地会话，
    // 让应用启动后的首次路由判断有统一来源。
    return ref.read(authRepositoryProvider).restoreSession();
  }

  /// 提交登录请求并更新会话状态。
  Future<void> signIn({required String email, required String password}) async {
    // 先进入加载态，让页面可以禁用提交按钮并展示等待反馈。
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(authRepositoryProvider)
          .signIn(email: email, password: password),
    );
    _throwIfErrored();
  }

  /// 提交注册请求并更新会话状态。
  Future<void> signUp({required String email, required String password}) async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(
      () => ref
          .read(authRepositoryProvider)
          .signUp(email: email, password: password),
    );
    _throwIfErrored();
  }

  /// 退出当前账号，并显式清空控制器里的会话值。
  Future<void> logout() async {
    await ref.read(authRepositoryProvider).logout();

    // 登出后把状态设置为空会话，确保受保护路由立刻把用户带回登录页。
    state = const AsyncData(null);
  }

  /// 当异步操作失败时，把真实异常重新抛给调用方。
  ///
  /// 页面层通过 `try/catch` 就能拿到原始错误消息，并统一决定如何展示。
  void _throwIfErrored() {
    if (state.hasError) {
      Error.throwWithStackTrace(state.error!, state.stackTrace!);
    }
  }
}
