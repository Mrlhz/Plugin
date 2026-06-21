window.MyExtension = window.MyExtension || {};

(function() {

  // 核心功能：锁帖模块初始化
  window.MyExtension.checkAndApplyLocked = async function() {
    // 1. 获取当前页面的 URL 并解析出当前页面的 tid
    const currentTid = parseCurrentPageTid();
    
    // 2. 检查页面中是否存在指定的 locked 元素
    const isPageLockedNow = !!document.querySelector(".postmessage.firstpost .locked");

    if (isPageLockedNow && currentTid) {
      // 如果发现当前页确实被锁，且解析到了 tid，立即存入 storage
      await chrome.storage.local.set({ [`locked_${currentTid}`]: { isLocked: true } });
      console.log(`【Locked模块】检测到当前帖子(TID: ${currentTid})已被锁定，已记入本地存储`);
    }

    // 3. 扫描并渲染整个页面所有匹配的 locked 链接样式
    await renderLockedLinks();
  };

  // 内部辅助：动态渲染页面上已经被锁定的链接样式
  async function renderLockedLinks() {
    const links = [...document.querySelectorAll('a[href*="viewthread.php?tid="]')];
    if (links.length === 0) return;

    const storage = await chrome.storage.local.get(null);

    for (const link of links) {
      const href = link.getAttribute('href');
      if (href && href.includes('&page=')) continue;

      const { tid } = parseQuery(href);
      if (!tid) continue;

      // 如果缓存中包含这个 tid 的锁帖记录
      if (storage[`locked_${tid}`] && storage[`locked_${tid}`].isLocked) {
        // 🔴 醒目禁言样式：添加特殊 Class
        link.classList.add('my-ext-locked-link');
        
        // 如果没有外部 CSS，可以直接注入 inline 样式（文字中划线，醒目禁言红）
        link.style.textDecoration = 'line-through';
        link.style.color = '#ff4d4f'; // 类似 ElementUI 的红色危险警告色
        link.style.fontWeight = 'bold'; // 增强醒目度
      }
    }
  }

  // 内部辅助：解析当前页面的 URL 获取 tid
  function parseCurrentPageTid() {
    const params = new URLSearchParams(window.location.search);
    return params.get('tid');
  }

  // 内部辅助：解析 A 标签 href 的 tid
  function parseQuery(href) {
    if (!href) return { tid: null };
    const urlParts = href.split('?');
    const queryString = urlParts.length > 1 ? urlParts[1] : ''; 
    const params = new URLSearchParams(queryString);
    return { tid: params.get('tid') };
  }

})();
