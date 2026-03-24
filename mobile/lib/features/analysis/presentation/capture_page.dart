import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../../auth/logic/auth_controller.dart";
import "../logic/analysis_controller.dart";

/// 分析入口页。
///
/// 页面负责串起整条主链路：展示登录信息、选择图片、显示当前选中的文件，
/// 并在分析成功后跳转到结果页。
class CapturePage extends ConsumerWidget {
  const CapturePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final analysisState = ref.watch(analysisControllerProvider);
    final authSession = ref.watch(authControllerProvider).value;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            "Analyze one item",
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            authSession == null
                ? "Sign in to estimate one clear food or drink."
                : "Signed in as ${authSession.user.email}",
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          OutlinedButton.icon(
            onPressed: analysisState.isSubmitting
                ? null
                : () => ref
                      .read(analysisControllerProvider.notifier)
                      .pickFromCamera(),
            icon: const Icon(Icons.photo_camera_outlined),
            label: const Text("Take photo"),
          ),
          const SizedBox(height: 12),
          FilledButton.tonalIcon(
            onPressed: analysisState.isSubmitting
                ? null
                : () => ref
                      .read(analysisControllerProvider.notifier)
                      .pickFromGallery(),
            icon: const Icon(Icons.photo_library_outlined),
            label: const Text("Choose from gallery"),
          ),
          const SizedBox(height: 24),
          // 当前版本先展示文件名，让用户确认选中的确实是目标图片；
          // 如果后续需要更强反馈，再扩展缩略图预览即可。
          if (analysisState.selectedImage != null)
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(analysisState.selectedImage!.name),
              ),
            ),
          if (analysisState.errorMessage case final message?)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: Text(
                message,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: analysisState.isSubmitting
                ? null
                : () async {
                    // 只有真正拿到结果后才跳转，
                    // 避免结果页打开时发现状态里仍然没有可展示的数据。
                    final result = await ref
                        .read(analysisControllerProvider.notifier)
                        .submitSelectedImage();

                    if (context.mounted && result != null) {
                      context.go("/analysis/result");
                    }
                  },
            child: analysisState.isSubmitting
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Text("Analyze now"),
          ),
        ],
      ),
    );
  }
}
