window.MyExtension = window.MyExtension || {};

(function() {
  // 只负责注册核心业务逻辑，不包含任何事件监听或自动执行
  window.MyExtension.setClass = async function() {
    const links = [...document.querySelectorAll('a[href*="viewthread.php?tid="]')];
    if (links.length === 0) return { status: 'no-links', message: '没有找到匹配的链接' };

    // 如果插件更新，此行会抛出 Extension context invalidated 异常
    const storage = await chrome.storage.local.get(null);

    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.includes('&page=')) {
        continue;
      }

      const { tid } = parseQuery(href);
      if (storage[tid]) {
        link.classList.add('downloaded');
      }
    }
    return { status: 'complete', message: '链接标记完成' };
  };

  function parseQuery(href) {
    if (!href) return { tid: null };
    const urlParts = href.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : '';
    const params = new URLSearchParams(queryString);
    return { tid: params.get('tid') };
  }
})();
