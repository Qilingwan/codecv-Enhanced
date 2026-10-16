// Additive syntax extension; legacy Markdown remains handled by the original parser.
function fenceAt(line, fence) {
  if (!fence) {
    const match = line.match(/^\s*(`{3,}|~{3,})/);
    return match ? { char: match[1][0], size: match[1].length } : null;
  }
  const match = line.match(/^\s*(`{3,}|~{3,})\s*$/);
  return match && match[1][0] === fence.char && match[1].length >= fence.size ? null : fence;
}

function readGrid(lines, start) {
  const rows = [];
  let cells = [], content = [], fence = null, depth = 0;
  const cell = () => { cells.push(content.join('\n')); content = []; };
  const row = () => { cell(); rows.push(cells); cells = []; };
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i], marker = line.trim();
    const nextFence = fenceAt(line, fence);
    if (fence || nextFence) { content.push(line); fence = nextFence; continue; }
    if (/^::: (start|headStart|mainStart)$/.test(marker)) depth++;
    else if (/^::: (end|headEnd|mainEnd)$/.test(marker) && depth > 0) depth--;
    else if (depth === 0) {
      if (marker === '::: gridStart') return null; // No nested grid groups.
      if (marker === '::: gridEnd') {
        row();
        const columns = rows[0].length;
        // Keep incomplete/invalid groups as text while the user is typing.
        return columns >= 2 && columns <= 6 && rows.every(r => r.length === columns)
          ? { rows, columns, end: i } : null;
      }
      if (marker === '::: row') { row(); continue; }
      if (marker === ':::') { cell(); continue; }
    }
    content.push(line);
  }
  return null;
}

export function markdownWithGrid(markdown, parse, options) {
  if (!markdown.includes('::: gridStart')) return parse(markdown, options);
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const output = [], groups = [];
  let fence = null;
  let prefix = 'CODECVGRIDPLACEHOLDER';
  while (markdown.includes(prefix)) prefix += 'X';
  for (let i = 0; i < lines.length; i++) {
    const nextFence = fenceAt(lines[i], fence);
    if (fence || nextFence) { output.push(lines[i]); fence = nextFence; continue; }
    if (lines[i].trim() === '::: gridStart') {
      const group = readGrid(lines, i);
      if (group) {
        const token = `${prefix}${groups.length}END`;
        const html = `<div class="codecv-grid" data-columns="${group.columns}" style="--codecv-grid-columns:${group.columns}">` +
          group.rows.map(cells => '<div class="codecv-grid-row">' + cells.map(cell =>
            `<div class="codecv-grid-cell">${parse(cell, options)}</div>`).join('') + '</div>').join('') + '</div>';
        groups.push({ token, html });
        output.push('', token, '');
        i = group.end;
        continue;
      }
    }
    output.push(lines[i]);
  }
  let html = parse(output.join('\n'), options);
  for (const group of groups) html = html.split(`<p>${group.token}</p>`).join(group.html).split(group.token).join(group.html);
  return html;
}

export function gridToMarkdown(grid, serialize) {
  const rows = [...grid.children].filter(node => node.classList.contains('codecv-grid-row'));
  return '::: gridStart\n' + rows.map(row => [...row.children]
    .filter(node => node.classList.contains('codecv-grid-cell'))
    .map(cell => [...cell.childNodes].map((node, i) => serialize({
      node, parent: cell, latest: i === cell.childNodes.length - 1, uid: i + 1, whiteSpace: 0
    })).join('').trim()).join('\n:::\n')).join('\n::: row\n') + '\n::: gridEnd\n';
}
