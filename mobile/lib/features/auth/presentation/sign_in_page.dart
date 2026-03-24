import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";

import "../logic/auth_controller.dart";

/// 登录页面。
///
/// 该页只负责收集邮箱和密码、触发表单校验，并把真正的认证请求交给
/// [AuthController]，尽量保持展示层职责单一。
class SignInPage extends ConsumerStatefulWidget {
  const SignInPage({super.key});

  @override
  ConsumerState<SignInPage> createState() => _SignInPageState();
}

class _SignInPageState extends ConsumerState<SignInPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authState = ref.watch(authControllerProvider);

    // 提交中禁用操作按钮，避免用户重复点击导致并发请求。
    final isSubmitting = authState.isLoading;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Text(
                      "Sign in to CalSnap",
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      "Get a fast estimate for one clear food or drink.",
                      style: Theme.of(context).textTheme.bodyMedium,
                    ),
                    const SizedBox(height: 24),
                    TextFormField(
                      controller: _emailController,
                      decoration: const InputDecoration(
                        labelText: "Email",
                        border: OutlineInputBorder(),
                      ),
                      keyboardType: TextInputType.emailAddress,
                      validator: _validateEmail,
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _passwordController,
                      decoration: const InputDecoration(
                        labelText: "Password",
                        border: OutlineInputBorder(),
                      ),
                      obscureText: true,
                      validator: _validatePassword,
                    ),
                    const SizedBox(height: 16),
                    FilledButton(
                      onPressed: isSubmitting ? null : _submit,
                      child: const Text("Sign in"),
                    ),
                    TextButton(
                      onPressed: isSubmitting
                          ? null
                          : () => context.go("/auth/sign-up"),
                      child: const Text("Create account"),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  /// 校验表单并提交登录请求。
  Future<void> _submit() async {
    // 先在本地做最小校验，减少明显无效输入带来的网络请求。
    if (!_formKey.currentState!.validate()) {
      return;
    }

    try {
      await ref
          .read(authControllerProvider.notifier)
          .signIn(
            email: _emailController.text.trim(),
            password: _passwordController.text,
          );
    } catch (error) {
      if (!mounted) {
        return;
      }

      // 当前版本用 SnackBar 直接展示失败原因，
      // 让调试和演示阶段可以快速看到后端返回的信息。
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(SnackBar(content: Text(error.toString())));
    }
  }

  /// 校验邮箱输入。
  String? _validateEmail(String? value) {
    // 页面只做最小合法性检查，更严格的邮箱规则最终由后端兜底。
    if (value == null || value.trim().isEmpty || !value.contains("@")) {
      return "Enter a valid email";
    }

    return null;
  }

  /// 校验密码输入。
  String? _validatePassword(String? value) {
    if (value == null || value.length < 8) {
      return "Use at least 8 characters";
    }

    return null;
  }
}
