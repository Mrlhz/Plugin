(function () {
  const TARGET_URLS = ['/aweme/v1/web/aweme/detail', '/aweme/v1/web/aweme/post'];
  console.log("🚀 全能拦截脚本（XHR + Fetch 备份）已就绪...");

  function processData(json) {
    window.postMessage({ type: 'DOUYIN_DETAIL_DATA', payload: json }, '*');
  }

  // ==========================================
  // 1. XMLHttpRequest 拦截
  // ==========================================
  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function (method, url) {
    this._targetUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function (postData) {
    const xhrInstance = this;
    const oldOnReadyStateChange = xhrInstance.onreadystatechange;

    xhrInstance.onreadystatechange = function () {
      if (xhrInstance.readyState === 4) {
        const currentUrl = xhrInstance._targetUrl || "";

        if (TARGET_URLS.some(endpoint => currentUrl.includes(endpoint))) {
          try {
            let res = xhrInstance.response;
            if (typeof res === 'object' && res !== null) {
              processData({ url: currentUrl, result: res });
            } else {
              if (res instanceof ArrayBuffer) {
                res = new TextDecoder('utf-8').decode(res);
              }
              processData({ url: currentUrl, result: JSON.parse(res) });
            }
          } catch (e) {
            console.error("❌ XHR 解析数据失败:", e);
          }
        }
      }
      if (oldOnReadyStateChange) {
        return oldOnReadyStateChange.apply(xhrInstance, arguments);
      }
    };

    return originalSend.apply(this, arguments);
  };

  // ==========================================
  // 2. Fetch API 完整拦截
  // ==========================================
  const { fetch: originalFetch } = window;
  window.fetch = async (...args) => {
    const url = args[0] instanceof URL ? args[0].href : (typeof args[0] === 'string' ? args[0] : '');
    const response = await originalFetch(...args);
    
    if (TARGET_URLS.some(endpoint => url.includes(endpoint))) {
      try {
        const clone = response.clone();
        clone.json().then(data => {
          processData({ url, result: data });
        }).catch(err => console.error("❌ Fetch 读取 JSON 失败:", err));
      } catch (e) {
        console.error("❌ Fetch 复制流失败:", e);
      }
    }
    return response;
  };
})();
