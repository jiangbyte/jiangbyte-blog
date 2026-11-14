/**
 * 封面 URL 解析纯函数（无 IO）。
 */

/**
 * 按点路径取值，支持数组下标，如 images.0.url。
 */
export function pickJsonPath(data: unknown, path: string): string | undefined {
  // 1. 空路径直接拒绝
  if (!path.trim()) return undefined;

  // 2. 逐段下钻；遇非对象/越界则失败
  const parts = path.split('.');
  let cur: unknown = data;
  for (const part of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }

  // 3. 只要非空字符串
  return typeof cur === 'string' && cur.trim() ? cur.trim() : undefined;
}

/**
 * 把模板里的 `{seed}` 换成稳定种子。
 * 无占位时追加 `_s=`，避免多篇文章共用同一随机接口 URL 被浏览器缓存成同一张图。
 */
export function applyCoverSeed(url: string, seed?: string): string {
  if (!seed) return url;
  const encoded = encodeURIComponent(seed);
  // 1. 显式占位优先
  if (url.includes('{seed}')) return url.replaceAll('{seed}', encoded);
  // 2. 已有同名参数则不重复追加
  if (/[?&]_s=/.test(url)) return url;
  // 3. 缓存键分化
  return `${url}${url.includes('?') ? '&' : '?'}_s=${encoded}`;
}

/**
 * 轻量字符串哈希 → 正整数字符串，给没有 {seed} 的图源作缓存键。
 */
export function coverSeedHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}
