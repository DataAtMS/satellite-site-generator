// Storage helpers for the site-generator server
// Uses the Manus Forge storage proxy (same pattern as main app)

function ensureTrailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const baseUrl = process.env.BUILT_IN_FORGE_API_URL;
  const apiKey = process.env.BUILT_IN_FORGE_API_KEY;

  if (!baseUrl || !apiKey) {
    throw new Error("Storage credentials missing: BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY required");
  }

  const key = normalizeKey(relKey);
  const uploadUrl = new URL("v1/storage/upload", ensureTrailingSlash(baseUrl));
  uploadUrl.searchParams.set("path", key);

  // Convert to ArrayBuffer to satisfy strict Blob type requirements
  let blobPart: string | ArrayBuffer;
  if (typeof data === "string") {
    blobPart = data;
  } else {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data as Uint8Array);
    blobPart = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  }
  const blob = new Blob([blobPart], { type: contentType });
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: buildAuthHeaders(apiKey),
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${message}`);
  }

  const url = (await response.json()).url;
  return { key, url };
}
