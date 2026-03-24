import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "app.dart";

/// 统一封装应用启动流程。
///
/// 启动时先确保 Flutter 绑定已经可用，再通过 [ProviderScope]
/// 建立全局依赖容器，随后挂载真正的应用根组件。
void bootstrap() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const ProviderScope(child: CalSnapApp()));
}
