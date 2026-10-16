// @ts-nocheck
// Shared by the retained distribution and source build.
export async function localResumeExport(data) {
  const timer = new AbortController();
  const timeout = setTimeout(() => timer.abort(), 45000);
  try {
    const node = document.createElement('div');
    node.innerHTML = data.content;
    // Fetch external images in the user's browser, never from the renderer's network.
    for (const img of node.querySelectorAll('img')) {
      if (!img.getAttribute('src') || img.src.startsWith('data:')) continue;
      if (new URL(img.src, location.href).origin === location.origin) continue;
      try {
        const response = await fetch(img.src, { signal: timer.signal, credentials: 'omit' });
        if (!response.ok) throw new Error('image failed');
        const blob = await response.blob();
        img.src = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch { throw new Error('外链头像读取失败，请使用工具栏的本地头像上传功能后重试'); }
    }
    const cssLinks = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .map(link => link.href).filter(href => new URL(href).origin === location.origin && /\/css\/index-[^/]+\.css$/.test(new URL(href).pathname));
    const response = await fetch('/api/export', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, content: node.innerHTML, cssLinks, assetOrigin: location.origin }), signal: timer.signal
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(detail.error || `导出服务返回 HTTP ${response.status}`);
    }
    const result = await response.json();
    if (!Array.isArray(data.type === 1 ? result.picture?.data : result.pdf?.data)) throw new Error('导出服务响应格式不正确');
    return result;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('导出超时，请缩小头像图片后重试');
    if (error.message === 'Failed to fetch') throw new Error('无法连接本地导出服务，请检查容器状态');
    throw error;
  } finally { clearTimeout(timeout); }
}
