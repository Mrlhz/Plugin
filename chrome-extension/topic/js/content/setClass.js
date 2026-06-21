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
      // 提取当前链接状态
      const isDownloaded = !!storage[tid]; // 如果 storage[tid] 存在视为已下载
      const isLocked = !!(storage[`locked_${tid}`] && storage[`locked_${tid}`].isLocked);
      // 拿到渲染配置
      const config = getLinkConfig(isLocked, isDownloaded);
      // 应用配置
      // 批量处理 Class
      if (config.classesToAdd.length) {
        link.classList.add(...config.classesToAdd);
      }
      if (config.classesToRemove.length) {
        link.classList.remove(...config.classesToRemove);
      }
      // 批量处理 Style
      Object.assign(link.style, config.style);
      if (config.title) {
        link.setAttribute('title', config.title);
      } else {
        link.removeAttribute('title');
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
  /**
   * 根据当前的状态组合，返回对应的 DOM 渲染配置
   * @param {boolean} isLocked 是否被屏蔽
   * @param {boolean} isDownloaded 是否已下载
   * @returns {Object} 包含 class, style, title 的配置对象
   */
  function getLinkConfig(isLocked, isDownloaded) {
    const statusMap = {
      'locked_downloaded': {
        classesToAdd: ['downloaded', 'my-ext-locked-link'],
        classesToRemove: [],
        style: { textDecoration: 'line-through', color: '#ff4d4f' },
        title: "该帖子已被屏蔽且已下载"
      },
      'locked': {
        classesToAdd: ['my-ext-locked-link'],
        classesToRemove: ['downloaded'],
        style: { textDecoration: 'line-through', color: '#ff4d4f' },
        title: "该帖子已被屏蔽"
      },
      'downloaded': {
        classesToAdd: ['downloaded'],
        classesToRemove: ['my-ext-locked-link'],
        style: { textDecoration: 'none', color: '' }, // 留空则交由外部 CSS 控制
        title: "该帖子已下载"
      },
      'default': {
        classesToAdd: [],
        classesToRemove: ['downloaded', 'my-ext-locked-link'],
        style: { textDecoration: '', color: '' },
        title: null
      }
    };

    // 状态组合映射 Key
    let currentKey = 'default';
    if (isLocked && isDownloaded) {
      currentKey = 'locked_downloaded';
    } else if (isLocked) {
      currentKey = 'locked';
    } else if (isDownloaded) {
      currentKey = 'downloaded';
    }

    return statusMap[currentKey];
  }
})();
