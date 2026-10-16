import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { markdownWithGrid } from '../dist/grid-syntax.js';
let source = await readFile(new URL('../dist/js/markdown-transform-html-a1f02b0a.js', import.meta.url), 'utf8');
source = source.replace('import {markdownWithGrid} from "/grid-syntax.js";', '').replace('export{codecvMarkdown as m};', 'export{a as m};');
const { m: legacy } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
const parse = text => markdownWithGrid(text, legacy);
const example = '::: gridStart\nAAA\n:::\naaa\n:::\nAaA\n::: row\nBBBB\n:::\nbbb\n:::\nBbB\n::: gridEnd';
test('two rows share three columns and preserve all content', () => {
  const html = parse(example);
  assert.match(html, /data-columns="3"/);
  assert.equal((html.match(/class="codecv-grid-row"/g) || []).length, 2);
  assert.equal((html.match(/class="codecv-grid-cell"/g) || []).length, 6);
  for (const text of ['AAA','aaa','AaA','BBBB','bbb','BbB']) assert.ok(html.includes(`<p>${text}</p>`));
});
test('legacy flex and ordinary Markdown remain unchanged', () => {
  for (const text of ['## Title\n\n**Bold** icon:phone hello', '::: start\nAAA\n:::\naaa\n::: end']) assert.equal(parse(text), legacy(text));
});
test('multiple groups, 2/4 columns and empty cells', () => {
  const html = parse('::: gridStart\na\n:::\n\n::: gridEnd\n\n::: gridStart\na\n:::\nb\n:::\nc\n:::\nd\n::: gridEnd');
  assert.match(html,/data-columns="2"/); assert.match(html,/data-columns="4"/);
  assert.equal((html.match(/class="codecv-grid"/g) || []).length, 2);
});
test('unclosed and mismatched rows fall back without throwing', () => {
  for (const text of [example.replace('::: gridEnd',''), example.replace('bbb\n:::','bbb\n')]) assert.equal(parse(text),legacy(text));
});
test('code fences do not activate grid syntax', () => {
  assert.equal(parse('```md\n'+example+'\n```'),legacy('```md\n'+example+'\n```'));
});
test('inline Markdown, links, icons and nested legacy flex in cells', () => {
  const html=parse('::: gridStart\n**AAA**\n:::\n::: start\nA\n:::\nB\n::: end\n:::\n[link](https://example.com) icon:phone\n::: gridEnd');
  assert.match(html,/<strong>AAA<\/strong>/); assert.match(html,/class=flex-layout/);
  assert.match(html,/href=https:\/\/example.com/); assert.match(html,/icon-phone/);
});
test('CRLF input and literal placeholder text are safe', () => {
  assert.equal(parse(example.replaceAll('\n','\r\n')),parse(example));
  assert.ok(parse('CODECVGRIDPLACEHOLDER0END\n'+example).includes('<p>CODECVGRIDPLACEHOLDER0END</p>'));
});
test('cell HTML escaping follows legacy XSS defaults', () => {
  const html=parse('::: gridStart\n<script>alert(1)</script>\n:::\nB\n::: gridEnd');
  assert.ok(!html.includes('<script>')); assert.ok(html.includes('&lt;script>'));
});
test('fenced code inside a cell does not split the row', () => {
  const html=parse('::: gridStart\n```text\n::: row\n::: end\n```\n:::\nB\n::: gridEnd');
  assert.equal((html.match(/class="codecv-grid-row"/g)||[]).length,1);
  assert.match(html,/<pre>/); assert.ok(html.includes('::: row'));
});
