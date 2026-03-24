import "package:flutter/material.dart";
import "package:go_router/go_router.dart";

/// 登录后页面共用的基础壳组件。
///
/// 它统一提供标题栏和底部导航，让分析页、历史页等受保护页面
/// 在相同的应用结构中切换。
class AppScaffold extends StatelessWidget {
  const AppScaffold({required this.location, required this.child, super.key});

  final String location;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    // 当前版本只根据路径前缀计算选中项，
    // 用最直接的方式保持导航状态与路由一致。
    final selectedIndex = location.startsWith("/history") ? 1 : 0;

    return Scaffold(
      appBar: AppBar(title: const Text("CalSnap")),
      body: child,
      bottomNavigationBar: NavigationBar(
        selectedIndex: selectedIndex,
        destinations: const [
          NavigationDestination(
            icon: Icon(Icons.camera_alt_outlined),
            selectedIcon: Icon(Icons.camera_alt),
            label: "Analyze",
          ),
          NavigationDestination(
            icon: Icon(Icons.history_outlined),
            selectedIcon: Icon(Icons.history),
            label: "History",
          ),
        ],
        onDestinationSelected: (index) {
          // 点击当前页签时不重复跳转，避免无意义的路由刷新。
          if (index == selectedIndex) {
            return;
          }

          context.go(index == 0 ? "/analysis" : "/history");
        },
      ),
    );
  }
}
