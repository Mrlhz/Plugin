/**
 * @link https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
 */
function injectCustomScript(jsPath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(jsPath) // chrome-extension://xxxxxx/js/inject-script.js
  script.onload = function () {
    this.parentNode.removeChild(this)
  };
  (document.head || document.documentElement)?.appendChild(script);
}

(function() {
  let observer = null; // 全局存储监听器实例

  // 工具函数：防抖
  function debounce(fn, delay) {
    let timer = null;
    return function () {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, arguments), delay);
    };
  }

  // 核心功能安全执行器
  function safeExecuteAllMarkers() {
    // 安全检查，防止模块未加载成功
    if (!window.MyExtension || !window.MyExtension.setClass) return;

    Promise.resolve()
      .then(async () => {
        // 锁帖状态检查
        await window.MyExtension?.checkLocked();
        // 无权限状态检查
        await window.MyExtension?.checkUnauthorized();
        // 状态标记与样式渲染
        await window.MyExtension?.setClass();
      })
      .then(res => {
        if (res && res.status === 'complete') {
          console.log('标记成功:', res.message);
        }
      })
      .catch(error => {
        console.log('插件可能已更新，发生错误:', error);
        destroyExtension(); // 发生失效错误，立刻自毁监听器，防止卡顿
      });
  }

  // 异常自毁函数：一旦插件上下文失效，立刻清理页面上的监听，并提示用户
  function destroyExtension() {
    if (observer) {
      observer.disconnect();
      console.log('已自动注销 DOM 监听器。');
    }
    document.removeEventListener('click', safeExecuteAllMarkers, false);

    // 弹出柔和的全局提示
    if (!document.getElementById('ext-update-tip')) {
      const tip = document.createElement('div');
      tip.id = 'ext-update-tip';
      tip.style = "position:fixed;top:10px;right:10px;z-index:99999;background:#fff3cd;color:#856404;padding:10px;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.2);font-size:13px;";
      tip.innerText = "⚠️ 插件已在后台更新，请刷新页面以继续使用。";
      document.body.appendChild(tip);
    }
  }

  // 统一初始化调度流
  function mainInit() {
    console.log("MyExtension 主参谋启动...");

    injectCustomScript('js/inject-script.js');

    // 1. 执行不需要网络权限、不会失效的基础 UI 功能（如回到顶部）
    if (window.MyExtension && window.MyExtension.addBacktop) {
      window.MyExtension.addBacktop();
    }

    // 2. 首次进入页面执行链接标记
    safeExecuteAllMarkers();

    // 3. 全局点击事件联动
    document.addEventListener('click', safeExecuteAllMarkers, false);

    // 4. 动态 DOM 监听（使用防抖优化性能）
    const debouncedExecute = debounce(safeExecuteAllMarkers, 150);
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

  // 确保在正确的生命周期启动
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mainInit);
  } else {
    mainInit();
  }
})();
