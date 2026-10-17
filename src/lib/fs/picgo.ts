/**
 * 本机图床上传客户端（PicGo Server 协议兼容）。
 * 默认 POST http://127.0.0.1:36677/upload ，需用户自行运行 PicGo。
 */

import { readFile } from "@tauri-apps/plugin-fs";

export const DEFAULT_PICGO_ENDPOINT = "http://127.0.0.1:36677/upload";

export interface PicgoUploadResult {
  urls: string[];
}

function normalizeEndpoint(endpoint: string): string {
  const e = endpoint.trim() || DEFAULT_PICGO_ENDPOINT;
  return e.replace(/\/+$/, "");
}

function parseResponse(data: {
  success?: boolean;
  result?: string | string[];
  msg?: string;
}): string[] {
  if (data.success === false) {
    throw new Error(data.msg || "PicGo upload failed");
  }
  const result = data.result;
  const urls = Array.isArray(result)
    ? result.filter((u): u is string => typeof u === "string")
    : typeof result === "string"
      ? [result]
      : [];
  if (urls.length === 0) throw new Error("PicGo returned no URLs");
  return urls;
}

async function postForm(
  endpoint: string,
  form: FormData,
): Promise<PicgoUploadResult> {
  const resp = await fetch(normalizeEndpoint(endpoint), {
    method: "POST",
    body: form,
  });
  if (!resp.ok) throw new Error(`PicGo HTTP ${resp.status}`);
  const data = (await resp.json()) as {
    success?: boolean;
    result?: string | string[];
    msg?: string;
  };
  return { urls: parseResponse(data) };
}

/** 上传本地绝对路径（拖放） */
export async function uploadPathsToPicgo(
  paths: string[],
  endpoint = DEFAULT_PICGO_ENDPOINT,
): Promise<PicgoUploadResult> {
  if (paths.length === 0) return { urls: [] };
  const form = new FormData();
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i]!;
    const name = path.replace(/\\/g, "/").split("/").pop() || `image-${i}.png`;
    const bytes = await readFile(path);
    form.append(
      "file",
      new Blob([bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)]),
      name,
    );
  }
  return postForm(endpoint, form);
}

/** 上传粘贴 / DOM File */
export async function uploadFilesToPicgo(
  files: File[],
  endpoint = DEFAULT_PICGO_ENDPOINT,
): Promise<PicgoUploadResult> {
  if (files.length === 0) return { urls: [] };
  const form = new FormData();
  for (const file of files) {
    form.append("file", file, file.name || "image.png");
  }
  return postForm(endpoint, form);
}

export function toMarkdownImagesFromUrls(urls: string[]): string[] {
  return urls.map((u, i) => `![image-${i + 1}](${u})`);
}
