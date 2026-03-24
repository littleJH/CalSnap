import "app/bootstrap.dart";

/// 应用进程的 Dart 入口。
///
/// 这里刻意保持极薄，只负责把真正的初始化流程转交给
/// [bootstrap]，避免入口文件掺杂状态组装或业务逻辑。
void main() {
  bootstrap();
}
