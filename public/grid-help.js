export default `<section class="codecv-grid-help">
<h2>跨行对齐布局（新增）</h2>
<p>需要对齐多行中的同一列时，使用一组 <code>::: gridStart</code> / <code>::: gridEnd</code>；<code>::: row</code> 换行，<code>:::</code> 换列。每组支持 2～6 列，各行列数必须一致；空列也要保留分隔符。</p>
<pre style="white-space:pre-wrap;line-height:1.6;padding:16px;border:1px solid currentColor">::: gridStart
AAA
:::
aaa
:::
AaA
::: row
BBBB
:::
bbb
:::
BbB
::: gridEnd</pre>
<p><strong>以最靠近行首的中间元素为对齐基准。</strong>先按当前模板原有的 flex 布局计算每一行的位置，再取同一中间列中最靠左的首字位置作为公共对齐线；其他行的该列向左对齐到这里，不取最靠右的位置。例如上例保留 aaa 原先的位置，把 bbb 向左对齐到 aaa。第一列仍靠行首，最后一列仍靠行尾。多于三列时，对每个中间列分别取其最靠左的位置。</p>
<p>字体、内容或容器宽度变化后会重新计算；预览与 PDF/PNG 导出都使用这条规则。若长文本或窄容器使这些位置无法容纳所有列，则退回等宽列并换行，避免重叠。旧浏览器不支持 subgrid 时也会使用等宽列。</p>
<p>单元格内可使用加粗、链接、列表和图标。请把每个语法标记单独放在一行；代码围栏内的标记不会触发布局。不支持嵌套 grid 组；不完整或列数不一致的组会暂按原解析器处理，编辑器不会因此中断。</p>
<p>原 <code>::: start</code> / <code>::: end</code> 继续使用弹性布局。新增布局映射到 <code>codecv-grid</code>、<code>codecv-grid-row</code>、<code>codecv-grid-cell</code>，与模板中的 flex 样式独立。预览、本地 PDF/PNG 和内容模式回写均支持。</p>
</section>`;
