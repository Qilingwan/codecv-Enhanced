import http from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { alignGrids } from '../dist/grid-layout.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const port = Number(process.env.PORT || 80);
const limit = 12 * 1024 * 1024;
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf' };
const browser = await chromium.launch({ headless: true });
let active = 0;

async function asset(url) {
  const pathname = decodeURIComponent(new URL(url, 'http://assets.local').pathname);
  const target = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!target.startsWith(root + path.sep) || pathname.includes('\\')) throw new Error('Invalid asset');
  const ext = path.extname(target);
  if (!mime[ext]) throw new Error('Invalid asset type');
  return { body: await readFile(target), contentType: mime[ext] };
}

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}

async function readJSON(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw Object.assign(new Error('简历内容超过 12MB，请压缩图片后重试'), { status: 413 });
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString()); }
  catch { throw Object.assign(new Error('请求不是有效的 JSON'), { status: 400 }); }
}

async function render(data) {
  if (!data || typeof data.content !== 'string' || typeof data.style !== 'string' ||
      typeof data.link !== 'string' || ![0, 1].includes(data.type ?? 0)) {
    throw Object.assign(new Error('缺少简历内容或导出参数无效'), { status: 400 });
  }
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 794, height: 1123 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; context.close().catch(() => {}); }, 35000);
  const missing = new Set();
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const origin = new URL(data.assetOrigin || 'http://assets.local').origin;
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.protocol === 'data:') return route.continue();
      if (url.origin === origin || url.origin === 'http://assets.local') {
        try { return await route.fulfill(await asset(url.href)); } catch { /* reject unknown files */ }
      }
      missing.add(url.pathname);
      await route.abort();
    });
    const css = [];
    for (const item of data.cssLinks || []) {
      if (typeof item !== 'string' || !new URL(item, 'http://assets.local').pathname.startsWith('/css/')) continue;
      css.push((await asset(item)).body.toString());
    }
    if (data.link !== 'none') css.push((await asset(data.link)).body.toString());
    const iconCSS = (await asset('/fonts/iconfont.css')).body.toString();
    const gridCSS = (await asset('/grid-layout.css')).body.toString();
    // Keep user CSS after template CSS. Prevent </style> from escaping the style element.
    const styles = (css.join('\n') + '\n' + iconCSS + '\n' + gridCSS + '\n' + data.style + '\n' +
      '@page{size:A4;margin:0}html,body{margin:0;padding:0;width:210mm}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}').replace(/<\/style/gi, '<\\/style');
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><base href="http://assets.local/"><style>${styles}</style></head><body>${data.content}</body></html>`, { waitUntil: 'networkidle', timeout: 20000 });
    // Playwright evaluation works even though document scripts are disabled.
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map(img => img.decode().catch(() => {})));
    });
    await page.evaluate(alignGrids);
    const broken = await page.locator('img').evaluateAll(images => images.some(img => !img.complete || img.naturalWidth === 0));
    if (missing.size || broken) throw Object.assign(new Error('图片或字体资源无法读取。请将外链头像换为本地上传图片，检查自定义 CSS 中的外链资源'), { status: 422 });
    if ((data.type ?? 0) === 0) {
      const pdf = await page.pdf({ format: 'A4', margin: { top: 0, bottom: 0, left: 0, right: 0 }, printBackground: true, preferCSSPageSize: true });
      return { pdf: { type: 'Buffer', data: [...pdf] } };
    }
    const resume = page.locator('.jufe').first();
    if (!(await resume.count())) throw Object.assign(new Error('找不到简历预览节点'), { status: 400 });
    const box = await resume.boundingBox();
    if (!box || box.height > 20000) throw Object.assign(new Error('简历图片过长，请改用 PDF 导出'), { status: 400 });
    const picture = await resume.screenshot({ type: 'png', timeout: 15000 });
    return { picture: { type: 'Buffer', data: [...picture] } };
  } catch (error) {
    if (timedOut) throw Object.assign(new Error('导出超时，请缩小图片或减少内容后重试'), { status: 504 });
    throw error;
  } finally { clearTimeout(timer); await context.close(); }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/health') return json(res, browser.isConnected() ? 200 : 503, { ok: browser.isConnected(), active });
    if (url.pathname === '/api/export') {
      if (req.method !== 'POST') return json(res, 405, { error: '请使用 POST 请求' });
      if (req.headers.origin && req.headers.origin !== `http://${req.headers.host}` && req.headers.origin !== `https://${req.headers.host}`) return json(res, 403, { error: '不允许跨站导出请求' });
      if (active >= 2) return json(res, 503, { error: '正在处理其他导出，请稍后重试' });
      active++;
      try { return json(res, 200, await render(await readJSON(req))); }
      finally { active--; }
    }
    if (!['GET', 'HEAD'].includes(req.method)) return json(res, 405, { error: 'Method not allowed' });
    try {
      const file = await asset(url.href);
      res.writeHead(200, { 'Content-Type': file.contentType, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : file.body);
    } catch { json(res, 404, { error: '文件不存在' }); }
  } catch (error) {
    console.error('Export failed:', error.message);
    if (!res.headersSent) json(res, error.status || 500, { error: error.status ? error.message : '导出服务异常，请查看 docker logs' });
  }
});
server.requestTimeout = 45000;
server.listen(port, '0.0.0.0', () => console.log(`CodeCV listening on ${port}`));
for (const signal of ['SIGTERM', 'SIGINT']) process.on(signal, async () => { server.close(); await browser.close(); process.exit(0); });
