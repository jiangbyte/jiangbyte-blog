import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workspaceYaml = readFileSync(new URL('../pnpm-workspace.yaml', import.meta.url), 'utf8');
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));

test('workspace only includes the site package (CMS removed)', () => {
  assert.match(workspaceYaml, /packages:\s*\n\s*-\s*'\.'/);
  assert.doesNotMatch(workspaceYaml, /\bcms\b/);
  assert.equal(packageJson.scripts.cms, undefined);
  assert.equal(packageJson.scripts['cms:install'], undefined);
});
