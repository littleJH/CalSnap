import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";

import "../data/analysis_repository.dart";

/// 图片选择能力的抽象提供者。
///
/// 把设备相机/相册访问抽象出来后，测试可以注入假实现，
/// 不需要依赖真实系统权限和硬件环境。
final imageSelectorProvider = Provider<ImageSelector>((ref) {
  return DeviceImageSelector(ImagePicker());
});

/// 分析状态控制器提供者。
final analysisControllerProvider =
    NotifierProvider<AnalysisController, AnalysisState>(AnalysisController.new);

/// 分析页的完整状态。
///
/// 同时承载已选图片、分析结果、错误信息和提交中标记，
/// 让页面只需要监听一个状态源即可完成渲染。
class AnalysisState {
  const AnalysisState({
    this.selectedImage,
    this.result,
    this.errorMessage,
    this.isSubmitting = false,
  });

  final XFile? selectedImage;
  final AnalysisResult? result;
  final String? errorMessage;
  final bool isSubmitting;

  /// 复制当前状态并按需覆盖字段。
  ///
  /// `clearResult` 和 `clearError` 用于显式清空旧数据，
  /// 避免继续沿用已经过期的分析结果或错误文案。
  AnalysisState copyWith({
    XFile? selectedImage,
    AnalysisResult? result,
    String? errorMessage,
    bool? isSubmitting,
    bool clearResult = false,
    bool clearError = false,
  }) {
    return AnalysisState(
      selectedImage: selectedImage ?? this.selectedImage,
      result: clearResult ? null : (result ?? this.result),
      errorMessage: clearError ? null : (errorMessage ?? this.errorMessage),
      isSubmitting: isSubmitting ?? this.isSubmitting,
    );
  }
}

/// 协调选图与提交分析流程的控制器。
class AnalysisController extends Notifier<AnalysisState> {
  @override
  AnalysisState build() => const AnalysisState();

  /// 通过系统相机选择图片。
  Future<void> pickFromCamera() async {
    final image = await ref.read(imageSelectorProvider).pickFromCamera();
    if (image == null) {
      return;
    }

    // 一旦重新选图，就清掉旧结果和旧错误，保证界面始终对应当前图片。
    state = state.copyWith(
      selectedImage: image,
      clearError: true,
      clearResult: true,
    );
  }

  /// 通过系统相册选择图片。
  Future<void> pickFromGallery() async {
    final image = await ref.read(imageSelectorProvider).pickFromGallery();
    if (image == null) {
      return;
    }

    state = state.copyWith(
      selectedImage: image,
      clearError: true,
      clearResult: true,
    );
  }

  /// 提交当前已选择的图片并返回分析结果。
  Future<AnalysisResult?> submitSelectedImage() async {
    final image = state.selectedImage;
    if (image == null) {
      // 未选图时直接在前端给出提示，不触发无意义的后端请求。
      state = state.copyWith(errorMessage: "Choose an image first.");
      return null;
    }

    state = state.copyWith(isSubmitting: true, clearError: true);

    try {
      final result = await ref
          .read(analysisRepositoryProvider)
          .submitImage(image);
      state = state.copyWith(
        result: result,
        isSubmitting: false,
        clearError: true,
      );
      return result;
    } catch (error) {
      // 这里把异常文本保存在状态里，页面可以直接渲染，不用重复组装提示文案。
      state = state.copyWith(
        errorMessage: error.toString(),
        isSubmitting: false,
        clearResult: true,
      );
      return null;
    }
  }
}

/// 图片来源选择能力的抽象接口。
abstract class ImageSelector {
  /// 从相机获取图片。
  Future<XFile?> pickFromCamera();

  /// 从相册获取图片。
  Future<XFile?> pickFromGallery();
}

/// 真机环境下的图片选择实现。
class DeviceImageSelector implements ImageSelector {
  DeviceImageSelector(this._picker);

  final ImagePicker _picker;

  @override
  Future<XFile?> pickFromCamera() {
    // 真机环境下直接调用系统相机。
    return _picker.pickImage(source: ImageSource.camera);
  }

  @override
  Future<XFile?> pickFromGallery() {
    // 真机环境下直接调用系统相册。
    return _picker.pickImage(source: ImageSource.gallery);
  }
}
