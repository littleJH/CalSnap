import "package:calsnap_mobile/app/app.dart";
import "package:calsnap_mobile/core/auth/session_store.dart";
import "package:calsnap_mobile/features/auth/data/auth_repository.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";

void main() {
  // 这条 smoke test 只验证默认路由行为：
  // 当本地没有会话时，应用启动后应直接落到登录页。
  testWidgets("shows sign-in screen by default", (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(_WidgetFakeAuthRepository()),
        ],
        child: const CalSnapApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("Sign in to CalSnap"), findsOneWidget);
    expect(find.byType(TextFormField), findsNWidgets(2));
  });
}

/// 仅服务于默认路由测试的假认证仓库。
///
/// 这份测试只会走到 `restoreSession`，其余方法保留未实现即可，
/// 这样可以清楚表达“本测试无意覆盖登录/注册调用”。
class _WidgetFakeAuthRepository implements AuthRepository {
  @override
  Future<void> logout() async {}

  @override
  Future<AuthSession?> restoreSession() async => null;

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    throw UnimplementedError();
  }

  @override
  Future<AuthSession> signUp({
    required String email,
    required String password,
  }) async {
    throw UnimplementedError();
  }
}
