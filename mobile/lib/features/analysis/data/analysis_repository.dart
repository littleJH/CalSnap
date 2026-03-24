import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";

import "../../../core/api/api_client.dart";

/// 分析仓库提供者。
///
/// 该 Provider 负责给控制器注入真正的接口实现，方便测试时替换成假仓库。
final analysisRepositoryProvider = Provider<AnalysisRepository>((ref) {
  return ApiAnalysisRepository(apiClient: ref.watch(apiClientProvider));
});

/// 图片分析能力的抽象接口。
abstract class AnalysisRepository {
  /// 上传一张图片并返回结构化分析结果。
  Future<AnalysisResult> submitImage(XFile image);
}

/// 调用后端分析接口的仓库实现。
class ApiAnalysisRepository implements AnalysisRepository {
  ApiAnalysisRepository({required ApiClient apiClient})
    : _apiClient = apiClient;

  final ApiClient _apiClient;

  @override
  Future<AnalysisResult> submitImage(XFile image) async {
    // 上传接口需要的鉴权头和 multipart 细节都由 ApiClient 处理，
    // 仓库层只关心“提交图片并拿回结果”这一业务动作。
    final payload = await _apiClient.postMultipart("/analysis", image: image);
    return AnalysisResult.fromJson(payload);
  }
}

/// 页面可直接消费的统一分析结果模型。
///
/// 它既兼容识别成功场景，也兼容服务端建议重拍的场景，
/// 这样 UI 不必直接理解后端原始 JSON 的细枝末节。
class AnalysisResult {
  const AnalysisResult({
    required this.status,
    required this.foodName,
    required this.portionDescription,
    required this.caloriesKcal,
    required this.proteinGrams,
    required this.carbsGrams,
    required this.fatGrams,
    required this.confidenceLabel,
    required this.confidenceReason,
    required this.estimateDisclaimer,
    required this.retryRecommended,
    required this.retryReason,
    this.recordId,
  });

  final String status;
  final String foodName;
  final String portionDescription;
  final double caloriesKcal;
  final double proteinGrams;
  final double carbsGrams;
  final double fatGrams;
  final String confidenceLabel;
  final String confidenceReason;
  final String estimateDisclaimer;
  final bool retryRecommended;
  final String? retryReason;
  final String? recordId;

  /// 从后端响应生成统一结果对象。
  ///
  /// 当前后端会返回“识别成功”和“建议重拍”两种结构，
  /// 这里负责把它们压平为 UI 更容易消费的统一模型。
  factory AnalysisResult.fromJson(Map<String, dynamic> json) {
    final result = json["result"] as Map<String, dynamic>;
    final retryRecommended = result["retryRecommended"] as bool? ?? false;

    return AnalysisResult(
      status: json["status"] as String,
      recordId: json["recordId"] as String?,
      foodName: (result["foodName"] as String?) ?? "Retry needed",
      portionDescription: (result["portionDescription"] as String?) ?? "",
      // 重拍场景通常没有营养数字，这里统一兜底为 0，
      // 避免页面处处写空值判断。
      caloriesKcal: _toDouble(result["caloriesKcal"]),
      proteinGrams: _toDouble(result["proteinGrams"]),
      carbsGrams: _toDouble(result["carbsGrams"]),
      fatGrams: _toDouble(result["fatGrams"]),
      confidenceLabel: result["confidenceLabel"] as String,
      confidenceReason: result["confidenceReason"] as String,
      estimateDisclaimer: result["estimateDisclaimer"] as String,
      retryRecommended: retryRecommended,
      retryReason: result["retryReason"] as String?,
    );
  }

  /// 把后端返回的数字安全转换成 `double`。
  static double _toDouble(Object? value) {
    if (value == null) {
      return 0;
    }

    if (value is num) {
      return value.toDouble();
    }

    return double.parse(value.toString());
  }
}
