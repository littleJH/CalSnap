import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../logic/analysis_controller.dart";

/// 结果页。
///
/// 该页同时兼容识别成功和建议重拍两种后端返回，
/// 并把统一模型转换成用户可读的展示内容。
class ResultPage extends ConsumerWidget {
  const ResultPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final result = ref.watch(analysisControllerProvider).result;

    // 如果用户绕过正常流程直接进入结果页，
    // 就引导其回到分析入口重新提交图片。
    if (result == null) {
      return Center(
        child: FilledButton.tonal(
          onPressed: () => context.go("/analysis"),
          child: const Text("Back to analysis"),
        ),
      );
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            result.retryRecommended ? "Retake recommended" : result.foodName,
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(
            result.retryRecommended
                ? result.confidenceReason
                : result.portionDescription,
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 24),
          // 建议重拍时只展示可信度与原因，不展示虚假的营养数值，
          // 避免给用户造成“模型其实已经识别成功”的误导。
          if (!result.retryRecommended) ...[
            _MetricTile(
              label: "Calories",
              value: "${_formatNumber(result.caloriesKcal)} kcal",
            ),
            const SizedBox(height: 12),
            _InlineMetric(
              text: "Protein ${_formatNumber(result.proteinGrams)} g",
            ),
            const SizedBox(height: 8),
            _InlineMetric(text: "Carbs ${_formatNumber(result.carbsGrams)} g"),
            const SizedBox(height: 8),
            _InlineMetric(text: "Fat ${_formatNumber(result.fatGrams)} g"),
            const SizedBox(height: 16),
          ] else ...[
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(result.retryReason ?? "Please retake the photo."),
              ),
            ),
            const SizedBox(height: 16),
          ],
          Text(
            "Confidence: ${result.confidenceLabel}",
            style: Theme.of(context).textTheme.titleSmall,
          ),
          const SizedBox(height: 4),
          Text(result.confidenceReason),
          const SizedBox(height: 16),
          Text(
            result.estimateDisclaimer,
            style: Theme.of(context).textTheme.bodyMedium,
          ),
          const SizedBox(height: 24),
          FilledButton.tonal(
            onPressed: () => context.go("/analysis"),
            child: const Text("Analyze another item"),
          ),
        ],
      ),
    );
  }
}

/// 突出展示核心营养指标的卡片。
class _MetricTile extends StatelessWidget {
  const _MetricTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    // 热量是结果页最醒目的核心信息，因此单独做成卡片展示。
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: Theme.of(context).textTheme.labelLarge),
            const SizedBox(height: 4),
            Text(value, style: Theme.of(context).textTheme.headlineSmall),
          ],
        ),
      ),
    );
  }
}

/// 以行内文本方式展示的营养指标。
class _InlineMetric extends StatelessWidget {
  const _InlineMetric({required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(text, style: Theme.of(context).textTheme.titleMedium);
  }
}

/// 格式化营养数值，尽量移除无意义的小数位。
String _formatNumber(double value) {
  final rounded = value.toStringAsFixed(1);
  if (rounded.endsWith(".0")) {
    return rounded.substring(0, rounded.length - 2);
  }

  return rounded;
}
