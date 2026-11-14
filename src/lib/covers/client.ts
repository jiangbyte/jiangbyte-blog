/**
 * 浏览器侧随机封面：providers 顺序尝试 + 预检。
 * 加载中用骨架动画；成功后再露出 img，避免裂图图标。
 */

import type { CoverProvider, ResolvedCoverSlotConfig, ResolvedCoversConfig } from '@lib/config/types';
import { applyCoverSeed, coverSeedHash, pickJsonPath } from './pick';

/** v8：加载态骨架 */
const STORAGE_PREFIX = 'koharu.cover.v8.';
const FETCH_TIMEOUT_MS = 7000;
const PRELOAD_TIMEOUT_MS = 9000;
const POST_CONCURRENCY = 3;

function readSticky(key: string): string | undefined {
  try {
    const v = sessionStorage.getItem(key);
    return v?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function writeSticky(key: string, url: string): void {
  try {
    sessionStorage.setItem(key, url);
  } catch {
    /* private mode 等忽略 */
  }
}

function clearSticky(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function coverFrame(img: HTMLImageElement): HTMLElement | null {
  return img.closest<HTMLElement>('[data-cover-frame]') ?? img.parentElement;
}

function setLoading(img: HTMLImageElement, loading: boolean): void {
  const frame = coverFrame(img);
  frame?.classList.toggle('is-loading', loading);
  if (loading) {
    img.removeAttribute('data-cover-ready');
  }
}

/**
 * 预加载图片，失败或超时则拒绝。
 */
function preloadImage(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const probe = new Image();
    const timer = window.setTimeout(() => {
      probe.src = '';
      reject(new Error(`cover preload timeout: ${url}`));
    }, PRELOAD_TIMEOUT_MS);
    probe.referrerPolicy = 'no-referrer';
    probe.onload = () => {
      window.clearTimeout(timer);
      resolve(url);
    };
    probe.onerror = () => {
      window.clearTimeout(timer);
      reject(new Error(`cover preload failed: ${url}`));
    };
    probe.src = url;
  });
}

async function fetchJsonUrl(provider: CoverProvider, seed?: string): Promise<string | undefined> {
  if (provider.kind !== 'json' || !provider.pick) return undefined;
  const url = applyCoverSeed(provider.url, seed);
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: ctrl.signal, referrerPolicy: 'no-referrer' });
    if (!res.ok) return undefined;
    const data: unknown = await res.json();
    const imageUrl = pickJsonPath(data, provider.pick);
    if (!imageUrl) return undefined;
    return await preloadImage(imageUrl);
  } catch {
    return undefined;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchImageUrl(provider: CoverProvider, seed?: string): Promise<string | undefined> {
  if (provider.kind !== 'image') return undefined;
  const url = applyCoverSeed(provider.url, seed ?? coverSeedHash(String(Date.now())));
  try {
    return await preloadImage(url);
  } catch {
    return undefined;
  }
}

/**
 * 按 providers 顺序尝试，成功返回可展示的图片 URL。
 */
export async function resolveCoverFromProviders(providers: CoverProvider[], seed?: string): Promise<string | undefined> {
  for (const provider of providers) {
    const url = provider.kind === 'json' ? await fetchJsonUrl(provider, seed) : await fetchImageUrl(provider, seed);
    if (url) return url;
  }
  return undefined;
}

async function resolveSlotUrl(slot: ResolvedCoverSlotConfig, storageKey: string, seed?: string): Promise<string | undefined> {
  if (slot.sessionSticky) {
    const cached = readSticky(storageKey);
    if (cached) {
      try {
        return await preloadImage(cached);
      } catch {
        clearSticky(storageKey);
      }
    }
  }

  if (slot.mode === 'api') {
    const remote = await resolveCoverFromProviders(slot.providers, seed);
    if (remote) {
      if (slot.sessionSticky) writeSticky(storageKey, remote);
      return remote;
    }
    return undefined;
  }

  const list = slot.fallbackList?.length ? slot.fallbackList : slot.fallback ? [slot.fallback] : [];
  if (!list.length) return undefined;
  if (!seed) return list[0];
  const idx = Number(coverSeedHash(seed)) % list.length;
  return list[idx];
}

/**
 * 仅在预检成功后写入 src 并露出，避免空 src / 坏链出现裂图图标。
 */
function revealCoverImg(img: HTMLImageElement, url: string, onBroken?: () => void): void {
  img.removeAttribute('srcset');
  img.removeAttribute('sizes');
  const picture = img.closest('picture');
  if (picture) {
    for (const source of picture.querySelectorAll('source')) source.remove();
  }
  img.referrerPolicy = 'no-referrer';

  const handleError = () => {
    img.removeEventListener('error', handleError);
    img.removeAttribute('src');
    img.removeAttribute('data-cover-ready');
    setLoading(img, false);
    onBroken?.();
  };
  img.addEventListener('error', handleError);
  img.src = url;
  img.dataset.coverReady = '1';
  setLoading(img, false);
}

async function mapPool<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(limit, queue.length) }, async () => {
    while (queue.length) {
      const item = queue.shift();
      if (item === undefined) return;
      await worker(item);
    }
  });
  await Promise.all(runners);
}

/**
 * 应用头图与文章默认封面。
 */
export async function setupRandomCovers(config: ResolvedCoversConfig): Promise<void> {
  const heroImgs = document.querySelectorAll<HTMLImageElement>('img[data-cover-slot="hero"]');
  if (config.hero.mode === 'api' && heroImgs.length > 0) {
    for (const img of heroImgs) {
      if (!img.dataset.coverApplied) setLoading(img, true);
    }
    const key = `${STORAGE_PREFIX}hero`;
    const url = await resolveSlotUrl(config.hero, key);
    for (const img of heroImgs) {
      if (!url) {
        setLoading(img, false);
        continue;
      }
      if (img.dataset.coverApplied === url) {
        setLoading(img, false);
        img.dataset.coverReady = '1';
        continue;
      }
      revealCoverImg(img, url, () => {
        clearSticky(key);
        delete img.dataset.coverApplied;
      });
      img.dataset.coverApplied = url;
    }
  }

  if (config.post.mode !== 'api') return;
  const postImgs = [...document.querySelectorAll<HTMLImageElement>('img[data-cover-slot="post"]')];
  for (const img of postImgs) {
    if (!img.dataset.coverApplied) setLoading(img, true);
  }

  await mapPool(postImgs, POST_CONCURRENCY, async (img) => {
    const seed = img.dataset.coverSeed?.trim() || coverSeedHash('post');
    const key = `${STORAGE_PREFIX}post.${seed}`;
    if (img.dataset.coverApplied) {
      img.dataset.coverReady = '1';
      setLoading(img, false);
      return;
    }

    const url = await resolveSlotUrl(config.post, key, seed);
    if (!url) {
      setLoading(img, false);
      return;
    }
    revealCoverImg(img, url, () => {
      clearSticky(key);
      delete img.dataset.coverApplied;
    });
    img.dataset.coverApplied = url;
  });
}
