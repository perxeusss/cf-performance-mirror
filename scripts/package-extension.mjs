import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');

await cp(path.join(root, 'manifest.json'), path.join(dist, 'manifest.json'));
await rm(path.join(dist, 'icons'), { recursive: true, force: true });
await mkdir(path.join(dist, 'icons'), { recursive: true });
await cp(path.join(root, 'icons'), path.join(dist, 'icons'), { recursive: true });

console.log('Chrome extension package prepared in dist/');
