import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyCoverSeed, coverSeedHash, pickJsonPath } from './pick';

test('pickJsonPath 支持对象与数组下标', () => {
  assert.equal(pickJsonPath({ images: [{ url: 'https://a.test/x' }] }, 'images.0.url'), 'https://a.test/x');
  assert.equal(pickJsonPath({ url: 'https://b' }, 'url'), 'https://b');
  assert.equal(pickJsonPath({ url: 1 }, 'url'), undefined);
  assert.equal(pickJsonPath(null, 'a.b'), undefined);
});

test('applyCoverSeed 替换占位或追加缓存键', () => {
  assert.equal(applyCoverSeed('https://x/{seed}', 'ab c'), 'https://x/ab%20c');
  assert.equal(applyCoverSeed('https://x/static', 'ab'), 'https://x/static?_s=ab');
  assert.equal(applyCoverSeed('https://x/static?a=1', 'ab'), 'https://x/static?a=1&_s=ab');
  assert.notEqual(applyCoverSeed('https://rand/', 'slug-a'), applyCoverSeed('https://rand/', 'slug-b'));
});

test('coverSeedHash 同输入同输出', () => {
  assert.equal(coverSeedHash('slug-a'), coverSeedHash('slug-a'));
  assert.notEqual(coverSeedHash('slug-a'), coverSeedHash('slug-b'));
});

test('COVERS 默认不内置第三方 API', async () => {
  const { COVERS_DEFAULTS } = await import('@lib/config/covers');
  assert.equal(COVERS_DEFAULTS.hero.providers.length, 0);
  assert.equal(COVERS_DEFAULTS.post.providers.length, 0);
  assert.equal(COVERS_DEFAULTS.post.fallbackList.length, 0);
});
