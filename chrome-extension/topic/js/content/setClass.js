// content-script.js

let observer = null; // 用于全局存储监听器实例

document.addEventListener('click', async function() {
  Promise.try(setClass)
    .then(res => {
      console.log(res)
    })
    .catch(error => {
      console.log('插件更新，需要刷新页面，Error:', error)
    })
  // await setClass()
}, false);

// 核心功能函数：处理页面上的链接
async function setClass() {
  const links = [...document.querySelectorAll('a[href*="viewthread.php?tid="]')];
  if (links.length === 0) return { status: 'no-links', message: '没有找到匹配的链接' };

  // 🔴 只要插件更新，这一行就会抛出 "Extension context invalidated" 错误
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
  return { status: 'complete', message: '链接标记完成 setClass.js' };
}

// 安全执行包装函数
function safeExecute() {
  // 使用标准的 Promise 包装（确保兼容性）
  Promise.resolve()
    .then(() => setClass())
    .then(res => {
      console.log('执行成功:', res);
    })
    .catch(error => {
      console.log('插件更新，需要刷新页面，Error:', error);
      
      // 💡 关键优化：一旦报错，说明插件已经失效，立刻停止监听 DOM，防止持续报错卡顿
      if (observer) {
        observer.disconnect();
        console.log('已自动注销 DOM 监听器。');
      }
      // 可选：在页面顶部悄悄弹出一个小横条提示用户
      const tip = document.createElement('div');
      tip.style = "position:fixed;top:10px;right:10px;z-index:99999;background:#fff3cd;color:#856404;padding:10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.2);";
      tip.innerText = "⚠️ 插件已更新，请刷新页面以继续标记链接。";
      document.body.appendChild(tip);
    });
}

// 防抖与初始化
const debouncedExecute = debounce(safeExecute, 150);

function init() {
  // 1. 首次进入页面执行
  safeExecute();

  // 2. 动态监听
  observer = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) {
      debouncedExecute();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 辅助函数：解析 URL 查询参数
function parseQuery(href) {
  if (!href) return { tid: null };
  
  // 找到问号的位置
  const urlParts = href.split('?');
  // 如果没有问号，说明没有参数
  const queryString = urlParts.length > 1 ? urlParts[1] : ''; 
  
  const params = new URLSearchParams(queryString);
  return {
    tid: params.get('tid')
  };
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
