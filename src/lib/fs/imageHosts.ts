/**
 * 图床配置：多配置文件 + 当前启用项。
 * 上传协议与 PicGo Server 兼容（multipart file → { success, result }）。
 */

import { DEFAULT_PICGO_ENDPOINT } from "@/lib/fs/picgo";

export type ImageHostKind = "picgo" | "custom";

export interface ImageHostProfile {
  id: string;
  name: string;
  kind: ImageHostKind;
  endpoint: string;
}

export const DEFAULT_IMAGE_HOST_ID = "picgo-default";

export function createDefaultImageHosts(
  endpoint = DEFAULT_PICGO_ENDPOINT,
): ImageHostProfile[] {
  return [
    {
      id: DEFAULT_IMAGE_HOST_ID,
      name: "PicGo",
      kind: "picgo",
      endpoint: endpoint.trim() || DEFAULT_PICGO_ENDPOINT,
    },
  ];
}

export function newImageHostId(): string {
  return `host-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function normalizeImageHosts(
  raw: unknown,
  fallbackEndpoint = DEFAULT_PICGO_ENDPOINT,
): ImageHostProfile[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return createDefaultImageHosts(fallbackEndpoint);
  }
  const out: ImageHostProfile[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : newImageHostId();
    const name =
      typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Host";
    const kind: ImageHostKind = o.kind === "custom" ? "custom" : "picgo";
    const endpoint =
      typeof o.endpoint === "string" && o.endpoint.trim()
        ? o.endpoint.trim()
        : DEFAULT_PICGO_ENDPOINT;
    out.push({ id, name, kind, endpoint });
  }
  return out.length > 0 ? out : createDefaultImageHosts(fallbackEndpoint);
}

export function resolveActiveHost(
  hosts: ImageHostProfile[],
  activeId: string | null | undefined,
): ImageHostProfile | null {
  if (hosts.length === 0) return null;
  const found = activeId
    ? hosts.find((h) => h.id === activeId)
    : undefined;
  return found ?? hosts[0] ?? null;
}
