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
      const isUnauthorized = !!(storage[`unauthorized_${tid}`] && storage[`unauthorized_${tid}`].isUnauthorized);
      // 拿到渲染配置
      const config = getLinkConfig(isLocked, isDownloaded, isUnauthorized);
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
   * @param {boolean} isUnauthorized 是否无权限
   * @returns {Object} 包含 class, style, title 的配置对象
   */
  function getLinkConfig(isLocked, isDownloaded, isUnauthorized) {
    const statusMap = {
      // 组合1：被屏蔽 + 已下载（最高优先级）
      'locked_downloaded': {
        classesToAdd: ['downloaded', 'my-ext-locked-link'],
        classesToRemove: ['my-ext-unauthorized-link'],
        style: { textDecoration: 'line-through', color: '#ff4d4f', borderBottom: 'none' },
        title: '该帖子已被屏蔽且已下载'
      },
      // 组合2：单纯被屏蔽
      'locked': {
        classesToAdd: ['my-ext-locked-link'],
        classesToRemove: ['downloaded', 'my-ext-unauthorized-link'],
        style: { textDecoration: 'line-through dashed #ff4d4f 2px', color: '#ff4d4f', borderBottom: '2px dashed #ff4d4f' },
        title: '该帖子已被屏蔽'
      },
      // 组合3：无权限 + 已下载
      'unauthorized_downloaded': {
        classesToAdd: ['downloaded', 'my-ext-unauthorized-link'],
        classesToRemove: ['my-ext-locked-link'],
        // 样式配置：灰色、加虚线下划线作为警告
        style: { textDecoration: 'none', color: '#e6a23c', borderBottom: '2px dashed #e6a23c' },
        title: '该帖子无权限且已下载'
      },
      // 组合4：单纯无权限
      'unauthorized': {
        classesToAdd: ['my-ext-unauthorized-link'],
        classesToRemove: ['downloaded', 'my-ext-locked-link'],
        // 样式配置：橙色警告色、加虚线下划线
        style: { textDecoration: 'line-through dashed #e6a23c 2px', color: '#e6a23c', borderBottom: '2px dashed #e6a23c' },
        title: '该帖子无权限'
      },
      // 组合5：单纯已下载
      'downloaded': {
        classesToAdd: ['downloaded'],
        classesToRemove: ['my-ext-locked-link', 'my-ext-unauthorized-link'],
        style: { textDecoration: 'none', color: '', borderBottom: 'none' }, 
        title: '该帖子已下载'
      },
      // 默认状态
      'default': {
        classesToAdd: [],
        classesToRemove: ['downloaded', 'my-ext-locked-link', 'my-ext-unauthorized-link'],
        style: { textDecoration: '', color: '', borderBottom: '' },
        title: null
      }
    };

    // 计算当前的优先级 Key (屏蔽 > 无权限 > 已下载)
    // 状态组合映射 Key
    let currentKey = 'default';
    if (isLocked && isDownloaded) {
      currentKey = 'locked_downloaded';
    } else if (isLocked) {
      currentKey = 'locked';
    } else if (isUnauthorized && isDownloaded) {
      currentKey = 'unauthorized_downloaded';
    } else if (isUnauthorized) {
      currentKey = 'unauthorized';
    } else if (isDownloaded) {
      currentKey = 'downloaded';
    }

    return statusMap[currentKey];
  }
})();
