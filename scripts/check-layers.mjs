// Checks the dependency rules in the README:
// - core imports nothing from features, layout or shared
// - shared imports nothing from core, layout or features
// - layout imports nothing from features
// - a feature imports no other feature
// Run: npm run lint:layers
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '..', 'src', 'app');
const aliases = { '@core/': 'core/', '@shared/': 'shared/', '@layout/': 'layout/', '@features/': 'features/' };

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : path.endsWith('.ts') ? [path] : [];
  });
}

function target(file, spec) {
  for (const [alias, folder] of Object.entries(aliases)) if (spec.startsWith(alias)) return folder + spec.slice(alias.length);
  if (spec.startsWith('.')) return relative(root, resolve(dirname(file), spec)).split(sep).join('/');
  return null;
}

const area = (path) => {
  const [top, name] = path.split('/');
  return top === 'features' ? `features/${name}` : top;
};

const forbidden = {
  core: (t) => ['features', 'layout', 'shared'].includes(t.split('/')[0]),
  shared: (t) => ['features', 'layout', 'core'].includes(t.split('/')[0]),
  layout: (t) => t.startsWith('features/'),
};

const problems = [];
for (const file of files(root)) {
  const from = relative(root, file).split(sep).join('/');
  const fromArea = area(from);
  const source = readFileSync(file, 'utf8');
  for (const [, spec] of source.matchAll(/(?:import|export)[^'"]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g).map((m) => [m[0], m[1] ?? m[2]])) {
    const to = target(file, spec);
    if (!to || area(to) === fromArea) continue;
    const top = fromArea.split('/')[0];
    const bad = forbidden[top]?.(to) || (top === 'features' && to.startsWith('features/'));
    if (bad) problems.push(`${from} imports ${spec}`);
  }
}

if (problems.length) {
  console.error(`Layer rule broken:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('Layer rules hold.');
