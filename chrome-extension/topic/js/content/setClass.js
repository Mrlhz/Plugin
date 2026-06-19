// content-script.js

// 辅助函数：解析 URL 查询参数
function parsequery(queryString) {
  const params = new URLSearchParams(queryString);
  return {
    tid: params.get('tid')
  };
}

// 核心功能函数：处理页面上的链接
async function setClass() {
  // 只选择没有被处理过的链接，避免重复操作提升性能
  const links = [...document.querySelectorAll('a[href*="viewthread.php?tid="]:not(.processed)')];
  if (links.length === 0) return;

  const storage = await chrome.storage.local.get(null);

  for (const link of links) {
    // 标记该链接已被处理过，下次执行时跳过
    link.classList.add('processed');

    const href = link.getAttribute('href');
    if (href && href.includes('&page=')) {
      continue;
    }
    
    const queryString = href.split('?')[1];
    if (!queryString) continue;

    const { tid } = parsequery(queryString);
    if (storage[tid]) {
      link.classList.add('downloaded');
    }
  }
}

// 防抖函数：避免频繁触发导致的性能问题
function debounce(fn, delay) {
  let timer = null;
  return function () {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, arguments);
    }, delay);
  };
}

// 创建防抖后的执行函数
const debouncedSetClass = debounce(setClass, 200);

// 启动入口
function init() {
  // 1. 页面加载完成先执行一次
  setClass();

  // 2. 动态监听 DOM 变化
  const observer = new MutationObserver((mutations) => {
    // 检测是否有新节点插入
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) {
      debouncedSetClass();
    }
  });

  // 监听整个 body 及其子元素的变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 确保在 DOM 准备就绪时运行
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
