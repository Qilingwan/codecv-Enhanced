import test from 'node:test';
import assert from 'node:assert/strict';
const origin = process.env.TEST_ORIGIN || 'http://127.0.0.1:18080';
for (let i = 0; i < 40; i++) {
  try { if ((await fetch(origin + '/api/health')).ok) break; } catch {}
  await new Promise(resolve => setTimeout(resolve, 250));
}
async function post(data) {
  return fetch(origin + '/api/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
}
const content = '<div class="jufe markdown-transform-html"><h1>中文简历导出测试</h1><p>修改后的内容 CodeCV 2026</p><a href="https://example.com">作品链接</a></div>';
const payload = { content, style: '.jufe{width:794px;padding:40px;font-family:"Noto Sans CJK SC"}h1{color:#2864a0}', link: 'none', type: 0 };
test('homepage restores local app entry', async () => {
  const text = await (await fetch(origin)).text();
  assert.match(text, /<script type="module" crossorigin src="\.\/js\/index-f040c366.js"><\/script>/);
  assert.ok(!text.includes("location.href = 'https://codecv.top'"));
});
test('PDF contains PDF bytes', async () => {
  const res = await post(payload);
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(Buffer.from((await res.json()).pdf.data).subarray(0, 5).toString(), '%PDF-');
});
test('PNG contains PNG bytes', async () => {
  const res = await post({ ...payload, type: 1 });
  assert.equal(res.status, 200, await res.clone().text());
  assert.equal(Buffer.from((await res.json()).picture.data).subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
});
test('invalid input returns a clear HTTP error', async () => {
  assert.equal((await post({})).status, 400);
  assert.equal((await post({ ...payload, type: 4 })).status, 400);
  assert.equal((await fetch(origin + '/api/export', { method: 'POST', body: '{' })).status, 400);
});
test('renderer blocks internal image fetching', async () => {
  const res = await post({ ...payload, content: '<div class="jufe"><img src="http://169.254.169.254/latest/meta-data/"></div>' });
  assert.equal(res.status, 422);
});
test('cross-site export request is rejected', async () => {
  const res = await fetch(origin + '/api/export', { method: 'POST', headers: { Origin: 'https://other.invalid' }, body: JSON.stringify(payload) });
  assert.equal(res.status, 403);
});
test('document scripts do not execute', async () => {
  const res = await post({ ...payload, content: '<div class="jufe">Safe<script>location.href="http://169.254.169.254/"</script></div>' });
  assert.equal(res.status, 200);
});
