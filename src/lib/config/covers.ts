/**
 * 封面配置归一化。
 *
 * 图源 URL 只来自 `config/site.yaml` 的 providers；不内置第三方 API，也不强制本地兜底图。
 */

import type { CoverProvider, CoverSlotConfig, CoversConfig, ResolvedCoversConfig } from './types';

export const COVERS_DEFAULTS: ResolvedCoversConfig = {
  hero: {
    mode: 'api',
    sessionSticky: true,
    providers: [],
  },
  post: {
    mode: 'api',
    sessionSticky: true,
    providers: [],
    fallbackList: [],
  },
};

function isCoverMode(value: unknown): value is 'api' | 'local' {
  return value === 'api' || value === 'local';
}

/**
 * 校验并清洗单个 provider；非法项丢弃。
 */
export function normalizeCoverProvider(raw: unknown): CoverProvider | null {
  // 1. 必须是对象且有 url
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  if (typeof item.url !== 'string' || !item.url.trim()) return null;

  // 2. kind：缺省按有无 pick 推断
  const kind = item.kind === 'json' || item.kind === 'image' ? item.kind : typeof item.pick === 'string' ? 'json' : 'image';

  // 3. json 必须带 pick 路径
  if (kind === 'json') {
    if (typeof item.pick !== 'string' || !item.pick.trim()) return null;
    return { kind, url: item.url.trim(), pick: item.pick.trim() };
  }

  return { kind: 'image', url: item.url.trim() };
}

function normalizeProviders(raw: unknown): CoverProvider[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeCoverProvider).filter((p): p is CoverProvider => p != null);
}

function normalizeSlot(
  raw: Partial<CoverSlotConfig> | null | undefined,
  defaults: ResolvedCoversConfig['hero'],
): ResolvedCoversConfig['hero'] {
  const source = (raw ?? {}) as Record<string, unknown>;
  const fallbackList =
    Array.isArray(source.fallbackList) && source.fallbackList.every((x) => typeof x === 'string')
      ? (source.fallbackList as string[])
      : undefined;

  const fallback = typeof source.fallback === 'string' && source.fallback.trim() ? source.fallback.trim() : undefined;

  const providers = normalizeProviders(source.providers);
  const mode = isCoverMode(source.mode) ? source.mode : defaults.mode;
  // 无 providers 时 api 降为 local（且无本地池则封面留空，仅 LQIP）
  const resolvedMode = mode === 'api' && providers.length === 0 ? 'local' : mode;

  return {
    mode: resolvedMode,
    fallback,
    sessionSticky: typeof source.sessionSticky === 'boolean' ? source.sessionSticky : defaults.sessionSticky,
    providers,
    ...(fallbackList ? { fallbackList } : {}),
  };
}

/**
 * 解析 `covers:`。不再用 defaultCoverList / 内置封面池作兜底。
 */
export function normalizeCoversConfig(raw?: CoversConfig | null): ResolvedCoversConfig {
  const source = raw ?? {};
  const hero = normalizeSlot(source.hero, COVERS_DEFAULTS.hero);
  const post = normalizeSlot(source.post, COVERS_DEFAULTS.post);

  return {
    hero,
    post: {
      ...post,
      fallbackList: post.fallbackList ?? [],
    },
  };
}
