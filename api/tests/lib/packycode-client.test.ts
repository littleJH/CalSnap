import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test, vi } from "vitest";

/**
 * 缓存测试开始前的 PackyCode 环境变量，方便在用例后完整恢复。
 */
const originalEnv = {
  PACKYCODE_BASE_URL: process.env.PACKYCODE_BASE_URL,
  PACKYCODE_API_KEY: process.env.PACKYCODE_API_KEY,
  PACKYCODE_MODEL: process.env.PACKYCODE_MODEL,
};

afterEach(() => {
  // 每次用例结束后都恢复 mock 和模块缓存，确保下个用例从干净状态开始。
  vi.restoreAllMocks();
  vi.resetModules();

  if (originalEnv.PACKYCODE_BASE_URL === undefined) {
    delete process.env.PACKYCODE_BASE_URL;
  } else {
    process.env.PACKYCODE_BASE_URL = originalEnv.PACKYCODE_BASE_URL;
  }

  if (originalEnv.PACKYCODE_API_KEY === undefined) {
    delete process.env.PACKYCODE_API_KEY;
  } else {
    process.env.PACKYCODE_API_KEY = originalEnv.PACKYCODE_API_KEY;
  }

  if (originalEnv.PACKYCODE_MODEL === undefined) {
    delete process.env.PACKYCODE_MODEL;
  } else {
    process.env.PACKYCODE_MODEL = originalEnv.PACKYCODE_MODEL;
  }
});

describe("PackyCode client", () => {
  test("posts image analysis to the responses endpoint and parses JSON output text", async () => {
    process.env.PACKYCODE_BASE_URL = "https://relay.example.com/v1";
    process.env.PACKYCODE_API_KEY = "secret";
    process.env.PACKYCODE_MODEL = "demo-model";

    // 通过真实临时文件模拟上传后的本地图片，覆盖 data URL 编码路径。
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-packycode-"));
    const imagePath = path.join(tempDir, "apple.jpg");
    await fs.writeFile(imagePath, "image-bytes");

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: "message",
            content: [
              {
                type: "output_text",
                text: JSON.stringify({
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
                }),
              },
            ],
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const mod = await import("../../src/lib/packycode/client.js");
    const result = await mod.analyzeImageWithPackyCode(imagePath);

    // 这里重点确认请求被发送到规范化后的 `/responses` 端点，并且携带鉴权头。
    expect(fetchMock).toHaveBeenCalledWith(
      "https://relay.example.com/v1/responses",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer secret",
        }),
      }),
    );

    const requestInit = fetchMock.mock.calls[0]?.[1];
    const body = JSON.parse(String(requestInit?.body));

    // 同时确认请求体里的模型名、JSON Schema 约束和图像 data URL 都被正确组装。
    expect(body).toMatchObject({
      model: "demo-model",
      instructions: expect.any(String),
      text: {
        format: {
          type: "json_schema",
          name: "food_analysis_result",
          strict: true,
          schema: expect.objectContaining({
            type: "object",
            properties: expect.objectContaining({
              foodName: expect.any(Object),
              retryRecommended: expect.any(Object),
            }),
          }),
        },
      },
      input: [
        {
          role: "user",
          content: expect.arrayContaining([
            expect.objectContaining({
              type: "input_text",
            }),
            expect.objectContaining({
              type: "input_image",
              image_url: expect.stringMatching(/^data:image\/jpeg;base64,/),
            }),
          ]),
        },
      ],
    });

    expect(result.retryRecommended).toBe(false);

    // 运行时这里已经断言过是成功结果，再补一次显式分支，便于 TypeScript 正确收窄联合类型。
    if (result.retryRecommended) {
      throw new Error("Expected a successful analysis result.");
    }

    expect(result.foodName).toBe("Apple");

    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test("turns unexpected upstream JSON into a service unavailable error", async () => {
    process.env.PACKYCODE_BASE_URL = "https://relay.example.com/v1";
    process.env.PACKYCODE_API_KEY = "secret";
    process.env.PACKYCODE_MODEL = "demo-model";

    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "calsnap-packycode-"));
    const imagePath = path.join(tempDir, "apple.jpg");
    await fs.writeFile(imagePath, "image-bytes");

    // 这里故意返回不符合业务 schema 的 JSON，验证客户端会做统一降级。
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          output: [
            {
              type: "message",
              content: [
                {
                  type: "output_text",
                  text: JSON.stringify({
                    identified_item: {
                      name: "Apple",
                    },
                  }),
                },
              ],
            },
          ],
        }),
      }),
    );

    const mod = await import("../../src/lib/packycode/client.js");

    await expect(mod.analyzeImageWithPackyCode(imagePath)).rejects.toMatchObject({
      statusCode: 503,
      message: "Analysis service returned an unexpected format.",
      retryable: true,
    });

    await fs.rm(tempDir, { recursive: true, force: true });
  });
});
