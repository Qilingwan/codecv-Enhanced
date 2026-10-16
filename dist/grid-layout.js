// Measure the original flex rows, then use the LEFTMOST original middle-column start.
// Self-contained so the same function can run in the renderer with document scripts disabled.
export function alignGrids() {
  for (const grid of document.querySelectorAll('.codecv-grid')) {
    if (grid.closest('[data-codecv-grid-probe]')) continue;
    const rows = [...grid.children].filter(node => node.classList.contains('codecv-grid-row'));
    const count = Number(grid.dataset.columns), width = grid.clientWidth, gap = 16;
    if (!rows.length || count < 2 || width <= 0) continue;
    const probe = document.createElement('div');
    probe.setAttribute('data-codecv-grid-probe', '');
    probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:${width}px;left:0;top:0;display:block;`;
    for (const row of rows) {
      const copy = row.cloneNode(true);
      copy.className = 'flex-layout';
      copy.removeAttribute('style');
      for (const cell of copy.children) { cell.className = 'flex-layout-item'; }
      probe.appendChild(copy);
    }
    grid.appendChild(probe);
    try {
      const box = probe.getBoundingClientRect(), scale = box.width / width || 1;
      const measures = [...probe.children].map(row => [...row.children].map(cell => {
        const rect = cell.getBoundingClientRect();
        return { start: (rect.left - box.left) / scale, width: rect.width / scale };
      }));
      if (measures.some(row => row.length !== count)) continue;
      const starts = [0];
      for (let col = 1; col < count - 1; col++) starts.push(Math.min(...measures.map(row => row[col].start)));
      starts.push(width - Math.max(...measures.map(row => row[count - 1].width)));
      // If intrinsic content leaves no viable track, use equal tracks and wrap instead of overlap.
      const feasible = starts.every((start, col) => Number.isFinite(start) && (col === 0 || start - starts[col - 1] > gap)) && width - starts[count - 1] > 0;
      const tracks = feasible ? starts.map((start, col) => (col === count - 1 ? width : starts[col + 1] - gap) - start) : Array(count).fill(Math.max(1, (width - gap * (count - 1)) / count));
      const columns = tracks.map(value => `${value.toFixed(4)}px`).join(' ');
      if (grid.style.gridTemplateColumns !== columns) grid.style.gridTemplateColumns = columns;
      if (grid.style.justifyContent !== 'start') grid.style.justifyContent = 'start';
    } finally { probe.remove(); }
  }
}

if (typeof document !== 'undefined') {
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; alignGrids(); });
  };
  const observer = new MutationObserver(records => {
    if (records.some(record => {
      if (record.target.nodeType === 1 && record.target.closest('[data-codecv-grid-probe]')) return false;
      if (record.type === 'attributes' && record.target.classList.contains('codecv-grid')) return false;
      if (record.type === 'childList' && [...record.addedNodes, ...record.removedNodes].every(node => node.nodeType === 1 && node.hasAttribute('data-codecv-grid-probe'))) return false;
      return true;
    })) schedule();
  });
  observer.observe(document.documentElement, { subtree:true, childList:true, characterData:true, attributes:true, attributeFilter:['class','style'] });
  const sizes = new WeakMap();
  const resize = new ResizeObserver(entries => {
    if (entries.some(entry => { const old=sizes.get(entry.target); sizes.set(entry.target,entry.contentRect.width); return old !== entry.contentRect.width; })) schedule();
  });
  const watch = new MutationObserver(() => {
    for (const grid of document.querySelectorAll('.codecv-grid')) if (!grid.closest('[data-codecv-grid-probe]') && !sizes.has(grid)) { sizes.set(grid,grid.clientWidth); resize.observe(grid); }
  });
  watch.observe(document.body, { subtree:true, childList:true });
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener('loadingdone',schedule);
  document.addEventListener('load',schedule,true);
  window.addEventListener('beforeprint',alignGrids);
  window.addEventListener('resize',schedule);
  schedule();
}
