// For the original dist in the supplied codecv-master.zip (2024-03-12).
import { readFile, writeFile, readdir, unlink, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
async function patch(file, before, after) {
  const name = path.join(root, file);
  const text = await readFile(name, 'utf8');
  if (text.includes(after)) return;
  if (text.split(before).length !== 2) throw new Error(`Unexpected upstream file: ${file}`);
  await writeFile(name, text.replace(before, after));
}
await patch('dist/js/config-3bd082f3.js',
  'async function Iu(u){return await(await fetch("https://codecv.netlify.app/.netlify/functions/export",{method:"POST",body:JSON.stringify(u)})).json()}',
  'async function Iu(u){const {localResumeExport}=await import("/export-client.js");return localResumeExport(u)}');
await patch('dist/js/editor-eb809c74.js', 'se="application/"+m?"pdf":"png"', 'se=m?"application/pdf":"image/png"');
const editor = path.join(root, 'dist/js/editor-eb809c74.js');
let text = await readFile(editor, 'utf8');
const catchPattern = /catch\(V\)\{const M=V\.message=="Failed to fetch"\?[^;]+;Re\(M\)\}/;
if (catchPattern.test(text)) {
  text = text.replace(catchPattern, 'catch(V){Re(V.message||"导出失败，请检查本地服务")}');
  await writeFile(editor, text);
} else if (!text.includes('catch(V){Re(V.message||')) throw new Error('Export error handler changed');
let html = await readFile(path.join(root, 'dist/index.html'), 'utf8');
html = html.replace(/<!-- (<script type="module" crossorigin[\s\S]*?<link rel="stylesheet" href="\.\/css\/index-eaa15cac\.css">) -->/, '$1');
html = html.replace(/\s*<script>\s*window.onload = function\(\) \{\s*location.href = 'https:\/\/codecv.top'\s*\}\s*<\/script>/, '');
if (!html.includes('href="./fonts/iconfont.css"')) html = html.replace('</head>', '<link rel="stylesheet" href="./fonts/iconfont.css">\n</head>');
await writeFile(path.join(root, 'dist/index.html'), html);
// Disable abandoned telemetry in private deployments.
const config = path.join(root, 'dist/js/config-3bd082f3.js');
text = await readFile(config, 'utf8');
const start = text.indexOf('const B=');
const end = text.indexOf('const o=`');
if (start >= 0 && end > start) {
  text = text.slice(0, start) + 'async function Iu(u){const {localResumeExport}=await import("/export-client.js");return localResumeExport(u)}function t(){return Promise.resolve(0)}function qu(){return Promise.resolve()}function n(){return Promise.resolve({result:null})}function Wu(){return Promise.resolve()}function Qu(){return Promise.resolve([])}' + text.slice(end);
  await writeFile(config, text);
}
for (const dir of ['js', 'css']) for (const file of await readdir(path.join(root, 'dist', dir))) {
  if (file.endsWith('.gz')) await unlink(path.join(root, 'dist', dir, file));
}
await copyFile(path.join(root, 'dist/export-client.js'), path.join(root, 'public/export-client.js'));
console.log('Patched distribution, local homepage, export and telemetry.');
