import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "router.dart";

/// 应用根组件。
///
/// 该组件只关心两件事：提供全局主题，以及把依赖认证状态的路由配置
/// 接入 `MaterialApp.router`。具体页面内容仍由各功能模块自己负责。
class CalSnapApp extends ConsumerWidget {
  const CalSnapApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // 路由守卫依赖当前会话，因此这里直接监听路由 Provider，
    // 让登录态变化可以同步刷新导航结果。
    final router = ref.watch(routerProvider);

    return MaterialApp.router(
      title: "CalSnap",
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1E7F5C)),
        useMaterial3: true,
      ),
      routerConfig: router,
    );
  }
}
