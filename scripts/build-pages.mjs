import {cp, mkdir, rm, writeFile} from 'node:fs/promises';
import {basename, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(root, 'dist');
await rm(destination, {recursive: true, force: true});
await mkdir(destination, {recursive: true});
for (const entry of ['index.html', 'style.css', 'assets', 'src', 'upstream', 'docs']) {
  await cp(resolve(root, entry), resolve(destination, entry), {
    recursive: true,
    filter: path => basename(path) !== '.DS_Store',
  });
}
await cp(resolve(root, 'artifacts/rover-damage-review'), resolve(destination, 'artifacts/rover-damage-review'), {
  recursive: true,
  filter: path => !/(?:\.png|\.mjs|report\.json|browser-review\.json|audit\.json|\.DS_Store)$/.test(path),
});
await writeFile(resolve(destination, '.nojekyll'), '');
console.log('GitHub Pages site built in dist/');
