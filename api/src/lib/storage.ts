import fs from "node:fs/promises";
import path from "node:path";

import type { Express } from "express";
import { nanoid } from "nanoid";

import { env } from "../config/env.js";

/**
 * 将上传的图片缓冲区持久化到本地磁盘。
 * 返回值同时包含：
 * 1. 给模型分析使用的绝对路径；
 * 2. 适合写入数据库的相对文件名，方便以后替换存储后端。
 */
export async function saveUpload(file: Express.Multer.File) {
  // 启动时不要求目录必须已存在，缺失时在第一次上传时自动补齐。
  await fs.mkdir(env.UPLOAD_DIR, { recursive: true });

  // 尽量保留原始扩展名，既方便排查问题，也方便未来扩展静态资源访问策略。
  const extension = path.extname(file.originalname) || ".jpg";
  const fileName = `${nanoid()}${extension}`;
  const absolutePath = path.join(env.UPLOAD_DIR, fileName);

  // 这里写入的是 multer 已经读到内存里的文件内容。
  await fs.writeFile(absolutePath, file.buffer);

  return {
    absolutePath,
    relativePath: fileName,
  };
}
