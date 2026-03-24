import "package:calsnap_mobile/app/app.dart";
import "package:calsnap_mobile/core/auth/session_store.dart";
import "package:calsnap_mobile/features/analysis/data/analysis_repository.dart";
import "package:calsnap_mobile/features/analysis/logic/analysis_controller.dart";
import "package:calsnap_mobile/features/auth/data/auth_repository.dart";
import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:flutter_test/flutter_test.dart";
import "package:image_picker/image_picker.dart";

void main() {
  // 用假依赖把“注册 -> 选图 -> 分析 -> 查看结果”整条主链路跑通，
  // 重点验证页面流转和关键文案，而不是后端或系统能力本身。
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
/// 登录和注册都会立即返回固定会话，让测试聚焦在路由切换和页面状态变化，
/// 不受真实后端环境影响。
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

  /// 生成测试过程中复用的固定会话。
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
/// 它返回稳定的苹果识别结果，确保测试只验证展示内容和交互流程，
/// 不受网络波动或模型输出不稳定影响。
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
/// 通过返回固定文件名，测试无需调用系统相机或相册，
/// 也能稳定推进选图后的页面逻辑。
class FakeImageSelector implements ImageSelector {
  @override
  Future<XFile?> pickFromCamera() async => XFile("demo-camera.jpg");

  @override
  Future<XFile?> pickFromGallery() async => XFile("demo-apple.jpg");
}
