import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../core/ui/app_scaffold.dart";
import "../features/analysis/presentation/capture_page.dart";
import "../features/analysis/presentation/result_page.dart";
import "../features/auth/logic/auth_controller.dart";
import "../features/auth/presentation/sign_in_page.dart";
import "../features/auth/presentation/sign_up_page.dart";

/// 全局路由配置提供者。
///
/// 这里统一收口登录页、注册页、分析页和历史页的访问规则，
/// 让页面本身不用再重复判断“当前是否已登录”。
final routerProvider = Provider<GoRouter>((ref) {
  final authState = ref.watch(authControllerProvider);

  // 首次进入应用时，会话恢复还没结束，此时需要先停留在 loading 页，
  // 避免受保护页面和认证页面来回闪烁。
  final isLoading =
      authState.isLoading && !authState.hasValue && !authState.hasError;
  final isAuthenticated = authState.value != null;

  return GoRouter(
    initialLocation: "/loading",
    routes: [
      GoRoute(
        path: "/loading",
        builder: (context, state) => const _LoadingPage(),
      ),
      GoRoute(
        path: "/auth/sign-in",
        builder: (context, state) => const SignInPage(),
      ),
      GoRoute(
        path: "/auth/sign-up",
        builder: (context, state) => const SignUpPage(),
      ),
      ShellRoute(
        builder: (context, state, child) =>
            AppScaffold(location: state.uri.path, child: child),
        routes: [
          GoRoute(
            path: "/analysis",
            builder: (context, state) => const CapturePage(),
            routes: [
              GoRoute(
                path: "result",
                builder: (context, state) => const ResultPage(),
              ),
            ],
          ),
          GoRoute(
            path: "/history",
            builder: (context, state) => const _HistoryPlaceholderPage(),
          ),
        ],
      ),
    ],
    redirect: (context, state) {
      final path = state.uri.path;
      final isAuthPath = path.startsWith("/auth/");
      final isProtectedPath =
          path.startsWith("/analysis") || path.startsWith("/history");

      // 会话恢复期间只允许停留在 loading 页，其他路径都先收敛到这里，
      // 等认证态明确以后再决定最终去向。
      if (isLoading) {
        return path == "/loading" ? null : "/loading";
      }

      // 未登录用户一旦尝试访问受保护区域，就强制回到登录页。
      if (!isAuthenticated && isProtectedPath) {
        return "/auth/sign-in";
      }

      // 已登录后不应再回到认证相关页面，避免出现“登录成功却仍停在登录页”的状态。
      if (isAuthenticated &&
          (isAuthPath || path == "/loading" || path == "/")) {
        return "/analysis";
      }

      // 未登录时访问根路径或 loading 页，都统一导向登录入口。
      if (!isAuthenticated && (path == "/" || path == "/loading")) {
        return "/auth/sign-in";
      }

      return null;
    },
  );
});

/// 会话恢复阶段的占位页面。
///
/// 这个页面没有业务内容，只负责在认证状态尚未明朗时提供稳定的视觉反馈。
class _LoadingPage extends StatelessWidget {
  const _LoadingPage();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(body: Center(child: CircularProgressIndicator()));
  }
}

/// 历史功能尚未接入时的占位页。
///
/// 它保留了受保护路由和登出入口，确保未来接入真实历史列表时，
/// 外层导航壳和权限约束不需要重做。
class _HistoryPlaceholderPage extends ConsumerWidget {
  const _HistoryPlaceholderPage();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              "History is coming in the next story.",
              style: Theme.of(context).textTheme.titleMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 12),
            Text(
              "The protected app shell is ready for it.",
              style: Theme.of(context).textTheme.bodyMedium,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            FilledButton.tonal(
              onPressed: () =>
                  ref.read(authControllerProvider.notifier).logout(),
              child: const Text("Log out"),
            ),
          ],
        ),
      ),
    );
  }
}
