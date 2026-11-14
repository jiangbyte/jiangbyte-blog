import assert from 'node:assert/strict';
import { test } from 'node:test';
import { COVERS_DEFAULTS, normalizeCoverProvider, normalizeCoversConfig } from './covers';

test('normalizeCoversConfig 缺省不内置 API / 本地池', () => {
  const resolved = normalizeCoversConfig(undefined);
  assert.deepEqual(resolved.hero.providers, []);
  assert.deepEqual(resolved.post.providers, []);
  assert.deepEqual(resolved.post.fallbackList, []);
  assert.equal(resolved.hero.mode, 'local');
  assert.equal(resolved.post.mode, 'local');
});

test('normalizeCoversConfig 只使用配置里的 providers，无强制兜底', () => {
  const resolved = normalizeCoversConfig({
    hero: {
      mode: 'api',
      providers: [{ kind: 'image', url: 'https://v2.xxapi.cn/api/randomAcgPic?type=pc&return=302' }],
    },
    post: {
      mode: 'api',
      providers: [{ kind: 'image', url: 'https://v2.xxapi.cn/api/randomAcgPic?type=pc&return=302&_s={seed}' }],
    },
  });
  assert.equal(resolved.hero.mode, 'api');
  assert.equal(resolved.hero.fallback, undefined);
  assert.deepEqual(resolved.post.fallbackList, []);
  assert.ok(resolved.post.providers[0]?.url.includes('xxapi.cn'));
});

test('normalizeCoverProvider 丢弃非法项', () => {
  assert.equal(normalizeCoverProvider(null), null);
  assert.equal(normalizeCoverProvider({ kind: 'json', url: 'https://x' }), null);
  assert.deepEqual(normalizeCoverProvider({ kind: 'image', url: 'https://x.test/a' }), {
    kind: 'image',
    url: 'https://x.test/a',
  });
});

test('COVERS_DEFAULTS 不含第三方 API 与本地封面池', () => {
  assert.equal(COVERS_DEFAULTS.hero.providers.length, 0);
  assert.equal(COVERS_DEFAULTS.post.fallbackList.length, 0);
});
