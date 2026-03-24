import "package:calsnap_mobile/app/app.dart";
import "package:calsnap_mobile/core/auth/session_store.dart";
import "package:calsnap_mobile/features/analysis/data/analysis_repository.dart";
import "package:calsnap_mobile/features/analysis/logic/analysis_controller.dart";
import "package:calsnap_mobile/features/auth/data/auth_repository.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:image_picker/image_picker.dart";
import "package:integration_test/integration_test.dart";

void main() {
  // 初始化 integration_test 绑定，让这份测试可以在真机或模拟器环境执行。
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  // 当前集成测试仍使用假依赖，目标是覆盖设备环境中的页面交互路径，
  // 而不是把不稳定因素引入到演示流程里。
  testWidgets("sign up and analyze one item shows a structured estimate", (
    tester,
  ) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(FakeAuthRepository()),
          analysisRepositoryProvider.overrideWithValue(
            FakeAnalysisRepository(),
          ),
          imageSelectorProvider.overrideWithValue(FakeImageSelector()),
        ],
        child: const CalSnapApp(),
      ),
    );
    await tester.pumpAndSettle();

    expect(find.text("Sign in to CalSnap"), findsOneWidget);
    expect(find.text("Create account"), findsOneWidget);

    await tester.tap(find.text("Create account"));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(EditableText).first, "demo@example.com");
    await tester.enterText(find.byType(EditableText).last, "supersecret");

    await tester.tap(find.text("Create account"));
    await tester.pumpAndSettle();

    expect(find.text("Analyze one item"), findsOneWidget);
    expect(find.text("Choose from gallery"), findsOneWidget);

    await tester.tap(find.text("Choose from gallery"));
    await tester.pumpAndSettle();

    expect(find.text("demo-apple.jpg"), findsOneWidget);

    await tester.tap(find.text("Analyze now"));
    await tester.pumpAndSettle();

    expect(find.text("Apple"), findsOneWidget);
    expect(find.text("1 medium apple"), findsOneWidget);
    expect(find.text("95 kcal"), findsOneWidget);
    expect(find.text("Protein 0.5 g"), findsOneWidget);
    expect(find.text("Carbs 25 g"), findsOneWidget);
    expect(find.text("Fat 0.3 g"), findsOneWidget);
    expect(find.text("Estimated values for reference only."), findsOneWidget);
  });
}

/// 假认证仓库。
///
/// 在集成测试里也保持固定行为，避免依赖真实后端环境，
/// 从而让测试稳定聚焦于设备上的页面流转。
class FakeAuthRepository implements AuthRepository {
  AuthSession? _session;

  @override
  Future<void> logout() async {
    _session = null;
  }

  @override
  Future<AuthSession?> restoreSession() async => _session;

  @override
  Future<AuthSession> signIn({
    required String email,
    required String password,
  }) async {
    return _createSession(email);
  }

  @override
  Future<AuthSession> signUp({
    required String email,
    required String password,
  }) async {
    return _createSession(email);
  }

  /// 生成测试会话，模拟后端成功登录后的返回值。
  AuthSession _createSession(String email) {
    final session = AuthSession(
      token: "demo-token",
      user: AuthUser(id: "user-1", email: email),
    );
    _session = session;
    return session;
  }
}

/// 假分析仓库。
///
/// 返回固定识别结果，让测试验证重点停留在 UI 展示和跳转逻辑，
/// 而不是网络请求或识别服务本身。
class FakeAnalysisRepository implements AnalysisRepository {
  @override
  Future<AnalysisResult> submitImage(XFile image) async {
    return const AnalysisResult(
      status: "succeeded",
      recordId: "record-1",
      foodName: "Apple",
      portionDescription: "1 medium apple",
      caloriesKcal: 95,
      proteinGrams: 0.5,
      carbsGrams: 25,
      fatGrams: 0.3,
      confidenceLabel: "high",
      confidenceReason: "Single clear item",
      estimateDisclaimer: "Estimated values for reference only.",
      retryRecommended: false,
      retryReason: null,
    );
  }
}

/// 假图片选择器。
///
/// 通过返回可预测的文件名，集成测试不必真的唤起系统相机或相册，
/// 也能稳定覆盖选图后的后续流程。
class FakeImageSelector implements ImageSelector {
  @override
  Future<XFile?> pickFromCamera() async => XFile("demo-camera.jpg");

  @override
  Future<XFile?> pickFromGallery() async => XFile("demo-apple.jpg");
}
