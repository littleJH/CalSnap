import "package:dio/dio.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:image_picker/image_picker.dart";

/// 全局 API 客户端提供者。
///
/// 统一维护基础地址、超时策略和鉴权头写入逻辑，让上层仓库只关注业务接口。
final apiClientProvider = Provider<ApiClient>((ref) {
  return ApiClient(
    baseUrl: const String.fromEnvironment(
      "API_BASE_URL",
      defaultValue: "http://192.168.3.44:3000",
    ),
  );
});

/// 对 `dio` 的轻量封装。
///
/// 该类负责把常见请求方式收敛成统一入口，并把网络异常转换成
/// 可直接展示给界面的业务友好错误。
class ApiClient {
  /// 创建带默认超时配置的客户端。
  ///
  /// 移动端网络环境波动较大，这里统一设置连接和接收超时，
  /// 避免页面长时间卡在无响应状态。
  ApiClient({required String baseUrl})
    : _dio = Dio(
        BaseOptions(
          baseUrl: baseUrl,
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 15),
        ),
      );

  final Dio _dio;

  /// 设置或清除默认鉴权头。
  ///
  /// 登录成功后写入 Bearer Token，登出或会话失效时移除，
  /// 保证后续请求自动携带最新认证信息。
  void setAuthToken(String? token) {
    if (token == null || token.isEmpty) {
      _dio.options.headers.remove("Authorization");
      return;
    }

    _dio.options.headers["Authorization"] = "Bearer $token";
  }

  /// 发起 GET 请求并返回 JSON 对象。
  Future<Map<String, dynamic>> getJson(String path) async {
    try {
      final response = await _dio.get<Map<String, dynamic>>(path);
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// 发起 JSON POST 请求并返回 JSON 对象。
  Future<Map<String, dynamic>> postJson(
    String path, {
    Map<String, dynamic>? body,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(path, data: body);
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// 发起图片上传请求。
  ///
  /// 分析接口要求 `multipart/form-data`，因此由客户端统一负责把
  /// 选中的图片文件组装成上传体，避免页面层直接处理网络细节。
  Future<Map<String, dynamic>> postMultipart(
    String path, {
    required XFile image,
  }) async {
    try {
      final response = await _dio.post<Map<String, dynamic>>(
        path,
        data: FormData.fromMap({
          "image": await MultipartFile.fromFile(
            image.path,
            filename: image.name,
          ),
        }),
      );
      return response.data ?? <String, dynamic>{};
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }

  /// 发起 DELETE 请求。
  Future<void> delete(String path) async {
    try {
      await _dio.delete<void>(path);
    } on DioException catch (error) {
      throw ApiException.fromDio(error);
    }
  }
}

/// API 层统一抛出的异常对象。
///
/// 它保留了界面更关心的错误文案和状态码，方便页面直接提示用户，
/// 同时避免上层依赖底层网络库的异常结构。
class ApiException implements Exception {
  ApiException({required this.message, this.statusCode});

  final String message;
  final int? statusCode;

  /// 根据 `DioException` 提取更可读的错误信息。
  ///
  /// 优先使用服务端返回的 `message`，如果后端没有给出明确文案，
  /// 再退回到 Dio 自身的错误描述。
  factory ApiException.fromDio(DioException error) {
    final data = error.response?.data;
    final message = data is Map<String, dynamic> && data["message"] is String
        ? data["message"] as String
        : error.message ?? "Request failed";

    return ApiException(
      message: message,
      statusCode: error.response?.statusCode,
    );
  }

  @override
  String toString() => message;
}
