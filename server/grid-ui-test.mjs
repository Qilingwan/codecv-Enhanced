import { chromium } from '/app/server/node_modules/playwright/index.mjs';
import assert from 'node:assert/strict';
const browser = await chromium.launch({ headless:true });
const page = await browser.newPage({ viewport: { width:1440, height:1000 } });
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
const md = '## 跨行对齐布局\n\n::: gridStart\nAAA\n:::\naaa\n:::\nAaA\n::: row\nBBBB\n:::\nbbb\n:::\nBbB\n::: gridEnd\n\n## 原有弹性布局（保持原效果）\n\n::: start\nAAA\n:::\naaa\n:::\nAaA\n::: end\n\n::: start\nBBBB\n:::\nbbb\n:::\nBbB\n::: end';
await page.goto('http://127.0.0.1/#/editor?type=10front_end');
await page.locator('.cm-content').waitFor();
await page.locator('.driver-popover-close-btn').click();
await page.locator('.cm-content').click();
await page.keyboard.press('Control+a');
await page.keyboard.insertText(md);
await page.waitForTimeout(400);
const aligned = await page.locator('.reference-dom').first().evaluate(root=>{
  const rows=[...root.querySelectorAll('.codecv-grid-row')];
  return rows.map(row=>[...row.children].map(cell=>{
    const range=document.createRange(); range.selectNodeContents(cell.querySelector('p'));
    const box=range.getBoundingClientRect(); return {left:box.left,right:box.right};
  }));
});
assert.equal(aligned.length,2);
assert.ok(Math.abs(aligned[0][1].left-aligned[1][1].left)<0.1,JSON.stringify(aligned));
assert.ok(Math.abs(aligned[0][0].left-aligned[1][0].left)<0.1);
assert.ok(Math.abs(aligned[0][2].right-aligned[1][2].right)<0.1);
console.log('Column positions match:',JSON.stringify(aligned));
const legacyStarts=await page.locator('.reference-dom').first().evaluate(root=>[...root.querySelectorAll('.flex-layout')].map(row=>{
 const range=document.createRange(); range.selectNodeContents(row.children[1].querySelector('p'));return range.getBoundingClientRect().left;
}));
assert.equal(legacyStarts.length,2);
assert.ok(Math.abs(aligned[0][1].left-Math.min(...legacyStarts))<0.1,'Expected LEFTMOST original flex position: '+JSON.stringify({aligned,legacyStarts}));
assert.ok(Math.abs(aligned[0][1].left-Math.max(...legacyStarts))>1,'Must not use rightmost position');
console.log('Leftmost original flex baseline verified:',legacyStarts);
const downloading=page.waitForEvent('download',{timeout:45000});
await page.getByRole('button',{name:'导出PDF',exact:true}).click();
await (await downloading).saveAs('/tmp/grid-resume.pdf');
await page.getByText('导入/导出',{exact:true}).hover();
const pngDownloading=page.waitForEvent('download',{timeout:45000});
await page.getByText('导出图片',{exact:true}).click();
await (await pngDownloading).saveAs('/tmp/grid-resume.png');
console.log('PDF and PNG UI exports passed');
await page.locator('button[data-command="toContentMode"]').click();
await page.locator('.writable-edit-mode .codecv-grid').waitFor();
assert.equal(await page.locator('.writable-edit-mode .codecv-grid').evaluate(node=>getComputedStyle(node).display),'grid');
await page.locator('.writable-edit-mode .codecv-grid-row').nth(1).locator('.codecv-grid-cell').nth(1).locator('p').evaluate(node=>{
  node.textContent='bbb 内容模式修改';
  node.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText'}));
});
await page.locator('button[data-command="toMarkdownMode"]').click();
await page.locator('.cm-content').waitFor();
const roundtrip=await page.locator('.cm-content').innerText();
assert.match(roundtrip,/::: gridStart/); assert.match(roundtrip,/::: row/); assert.match(roundtrip,/::: gridEnd/);
assert.match(roundtrip,/bbb 内容模式修改/);
assert.equal(await page.locator('.reference-dom').first().locator('.codecv-grid-cell').count(),6);
console.log('Rich editor edit and Markdown round trip passed');
await page.goto('http://127.0.0.1/#/syntax/helper');
await page.getByRole('heading',{name:'跨行对齐布局（新增）',exact:true}).waitFor();
assert.match(await page.locator('.syntax-helper').innerText(),/::: gridStart/);
assert.match(await page.locator('.syntax-helper').innerText(),/以最靠近行首的中间元素为对齐基准/);
assert.equal(errors.length,0,errors.join('\n'));
console.log('Help content and JS error checks passed');
const overflow=await page.evaluate(async()=>{
  const {m:parse}=await import('/js/markdown-transform-html-a1f02b0a.js');
  const root=document.createElement('div');
  root.className='jufe'; root.style.cssText='width:300px;padding:0;position:absolute;left:0;top:0';
  root.innerHTML=parse('::: gridStart\n'+('很长的经历文字'.repeat(40))+'\n:::\naaa\n:::\n'+('SuperLongUnbrokenText'.repeat(10))+'\n::: row\nB\n:::\nbbbb\n:::\nlast\n::: gridEnd');
  document.body.appendChild(root);
  const box=root.getBoundingClientRect();
  const results=[...root.querySelectorAll('.codecv-grid-cell')].map(node=>{
    const rect=node.getBoundingClientRect();return rect.left>=box.left-1 && rect.right<=box.right+1 && node.scrollWidth<=node.clientWidth+1;
  });
  root.remove();return results;
});
assert.ok(overflow.every(Boolean),'Long text should wrap inside the resume: '+JSON.stringify(overflow));
console.log('Long Chinese and unbroken Latin text stay within columns');
const dynamic=await page.evaluate(async()=>{
 const {m:parse}=await import('/js/markdown-transform-html-a1f02b0a.js');
 const root=document.createElement('div');root.className='jufe markdown-transform-html';root.style.cssText='width:700px;padding:0;position:absolute;left:0;top:0';
 const body='A\n:::\nMiddleOne\n:::\nC\n:::\nD';
 const body2='LongFirst\n:::\nB\n:::\nMiddleTwo\n:::\nDD';
 root.innerHTML=parse('::: gridStart\n'+body+'\n::: row\n'+body2+'\n::: gridEnd\n\n::: start\n'+body+'\n::: end\n\n::: start\n'+body2+'\n::: end');document.body.appendChild(root);
 const wait=()=>new Promise(resolve=>setTimeout(resolve,150));
 const check=()=>{
  const original=[...root.querySelectorAll(':scope > .flex-layout')];
  const rows=[...root.querySelectorAll('.codecv-grid-row')];
  return [1,2].every(col=>{
   const baseline=Math.min(...original.map(row=>row.children[col].getBoundingClientRect().left));
   return rows.every(row=>Math.abs(row.children[col].getBoundingClientRect().left-baseline)<0.15);
  });
 };
 await wait();const initial=check();root.style.width='550px';await wait();const resized=check();
 root.querySelector('.codecv-grid-row .codecv-grid-cell p').textContent='DifferentFirstWidth';
 root.querySelector(':scope > .flex-layout .flex-layout-item p').textContent='DifferentFirstWidth';await wait();const edited=check();
 root.remove();return {initial,resized,edited};
});
assert.ok(Object.values(dynamic).every(Boolean),JSON.stringify(dynamic));
console.log('Four-column independent leftmost anchors, resize and content updates passed');
await browser.close();
