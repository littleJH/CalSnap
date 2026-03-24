import fs from "node:fs/promises";
import path from "node:path";

import { env } from "../../config/env.js";
import { serviceUnavailable } from "../../shared/http-errors.js";
import { ANALYSIS_SYSTEM_PROMPT } from "./prompts.js";
import { analysisResultJsonSchema, validateAnalysisResult } from "./validate-result.js";

/**
 * 兼容不同形式的 PackyCode 中继地址。
 * 无论上游传入的是根路径、带版本号路径，还是已经包含 `/responses` 的地址，
 * 这里都会归一化成真正的 responses 接口 URL。
 */
function buildResponsesUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  const normalizedPath = url.pathname.replace(/\/+$/, "");
  url.pathname = normalizedPath.endsWith("/responses")
    ? normalizedPath
    : `${normalizedPath}/responses`;
  return url.toString();
}

/**
 * 根据文件扩展名推断图片 MIME 类型。
 * 当前只覆盖常见格式，未命中时默认按 JPEG 处理。
 */
function inferImageMimeType(imagePath: string) {
  const ext = path.extname(imagePath).toLowerCase();

  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "image/jpeg";
}

/**
 * 从 PackyCode 的响应体里尽可能提取模型生成的文本结果。
 * 兼容两种常见返回形式：
 * 1. 顶层直接给出 `output_text`；
 * 2. 通过 `output[].content[]` 嵌套输出文本片段。
 */
function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;

  // 某些响应会直接把最终文本挂在顶层字段，优先走这条最短路径。
  const directOutputText = Reflect.get(payload, "output_text");
  if (typeof directOutputText === "string" && directOutputText.trim()) {
    return directOutputText.trim();
  }

  // 如果没有顶层文本，则尝试从多层消息结构中提取所有 output_text 片段。
  const output = Reflect.get(payload, "output");
  if (!Array.isArray(output)) return null;

  const textParts = output.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const content = Reflect.get(item, "content");
    if (!Array.isArray(content)) return [];

    return content.flatMap((part) => {
      if (!part || typeof part !== "object") return [];

      return Reflect.get(part, "type") === "output_text" && typeof Reflect.get(part, "text") === "string"
        ? [String(Reflect.get(part, "text"))]
        : [];
    });
  });

  return textParts.length > 0 ? textParts.join("\n").trim() : null;
}

/**
 * 解析模型返回的 JSON 文本。
 * 有些模型会把 JSON 包在 Markdown 代码块中，这里会先剥离围栏再交给 `JSON.parse`。
 */
function parseModelJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return JSON.parse(fenced ? fenced[1] : trimmed);
}

/**
 * 调用 PackyCode 中继服务分析图片，并将结果校验成业务可用的结构。
 * 整个过程都通过服务端转发完成，确保 API Key 只保留在后端。
 */
export async function analyzeImageWithPackyCode(imagePath: string) {
  // 没有中继地址、密钥或模型名时，直接把能力视为不可用。
  if (!env.PACKYCODE_BASE_URL || !env.PACKYCODE_API_KEY || !env.PACKYCODE_MODEL) {
    throw serviceUnavailable("PackyCode relay is not configured.");
  }

  // PackyCode 当前接口接收 data URL，因此这里先把本地图片转成 base64。
  const imageBase64 = (await fs.readFile(imagePath)).toString("base64");
  const imageDataUrl = `data:${inferImageMimeType(imagePath)};base64,${imageBase64}`;

  // 请求体显式要求模型返回符合 JSON Schema 的结构化结果。
  const response = await fetch(buildResponsesUrl(env.PACKYCODE_BASE_URL), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.PACKYCODE_API_KEY}`,
    },
    body: JSON.stringify({
      model: env.PACKYCODE_MODEL,
      instructions: ANALYSIS_SYSTEM_PROMPT,
      text: {
        format: {
          type: "json_schema",
          name: "food_analysis_result",
          strict: true,
          schema: analysisResultJsonSchema,
        },
      },
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: "Analyze this food image and return JSON only.",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
            },
          ],
        },
      ],
    }),
  });

  // 上游非 2xx 一律按暂时不可用处理，不向客户端泄露中继细节。
  if (!response.ok) {
    throw serviceUnavailable("Analysis service unavailable.");
  }

  const payload = await response.json();
  try {
    // 优先解析模型输出的文本 JSON；若上游已经直接返回对象，则直接校验对象本身。
    const outputText = extractOutputText(payload);

    if (outputText) {
      return validateAnalysisResult(parseModelJson(outputText));
    }

    return validateAnalysisResult(payload);
  } catch {
    // 只要上游结构不满足约定，就统一降级成可重试的服务不可用错误。
    throw serviceUnavailable("Analysis service returned an unexpected format.");
  }
}
