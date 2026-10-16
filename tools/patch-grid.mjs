import { readFile, writeFile, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function patch(file, before, after) {
  const full = path.join(root, file), text = await readFile(full, 'utf8');
  if (text.includes(after)) return;
  if (text.split(before).length !== 2) throw new Error(`Unexpected distribution: ${file}`);
  await writeFile(full, text.replace(before, after));
}
await patch('dist/js/markdown-transform-html-a1f02b0a.js', 'export{a as m};',
  'function codecvMarkdown(e,n){return markdownWithGrid(e,a,n)}export{codecvMarkdown as m};');
await patch('dist/js/markdown-transform-html-a1f02b0a.js', 'function v(e){',
  'import {markdownWithGrid} from "/grid-syntax.js";function v(e){');
await patch('dist/js/editor-eb809c74.js', 'function ze({parent:n,node:e,latest:o,uid:l,whiteSpace:a}){let u="";',
  'function ze({parent:n,node:e,latest:o,uid:l,whiteSpace:a}){if(e.nodeType===1&&e.classList.contains("codecv-grid"))return gridToMarkdown(e,ze);let u="";');
await patch('dist/js/editor-eb809c74.js', 'import{n as an,',
  'import {gridToMarkdown} from "/grid-syntax.js";import{n as an,');
await patch('dist/js/syntax-174ad51d.js', 'o.value.innerHTML=P', 'o.value.innerHTML=P+gridHelp');
await patch('dist/js/syntax-174ad51d.js', 'import{s as y}',
  'import gridHelp from "/grid-help.js";import{s as y}');
for (const file of ['dist/index.html', 'index.html']) {
  const full = path.join(root, file);
  let html = await readFile(full, 'utf8');
  if (!html.includes('href="/grid-layout.css"')) html = html.replace('</head>', '<link rel="stylesheet" href="/grid-layout.css">\n</head>');
  await writeFile(full, html);
}
for (const file of ['dist/index.html','index.html']) {
  const full=path.join(root,file); let html=await readFile(full,'utf8');
  if (!html.includes('src="/grid-layout.js"')) html=html.replace('</body>','<script type="module" src="/grid-layout.js"></script>\n</body>');
  await writeFile(full,html);
}
for (const file of ['grid-syntax.js', 'grid-layout.css', 'grid-help.js', 'grid-layout.js']) await copyFile(path.join(root, 'dist', file), path.join(root, 'public', file));
await copyFile(path.join(root, 'dist/grid-syntax.js'), path.join(root, 'src/utils/grid-syntax.js'));
await copyFile(path.join(root, 'dist/grid-layout.css'), path.join(root, 'src/assets/grid-layout.css'));
await copyFile(path.join(root, 'dist/grid-help.js'), path.join(root, 'src/views/syntax/sources/grid-help.ts'));
console.log('Grid syntax, distribution, rich editor round trip and help patched.');
