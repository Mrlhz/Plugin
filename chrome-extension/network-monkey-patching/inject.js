(function () {
  const TARGET_URLS = ['/aweme/v1/web/aweme/detail', '/aweme/v1/web/aweme/post']; // '/aweme/v1/web/aweme/related/'
  console.log("🚀 拦截脚本已就绪...");

  const XHR = XMLHttpRequest.prototype;
  const originalOpen = XHR.open;
  const originalSend = XHR.send;

  XHR.open = function (method, url) {
    // 将 URL 存储在实例上，方便后续 send 访问
    this._targetUrl = url;
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function (postData) {
    // 直接在实例上监听，不使用 addEventListener
    const xhrInstance = this;
    const oldOnReadyStateChange = xhrInstance.onreadystatechange;

    xhrInstance.onreadystatechange = function () {
      if (xhrInstance.readyState === 4) {
        const currentUrl = xhrInstance._targetUrl || "";

        // 确认在完成时能不能拿到 URL
        // console.log("请求完成，检查 URL:", currentUrl);
        if (TARGET_URLS.some(endpoint => currentUrl.includes(endpoint))) {
          console.log("🎯 发现目标接口 (命中逻辑已执行):", currentUrl);

          try {
            let res = xhrInstance.response;

            // 优先处理已经是对象的情况（responseType='json'）
            if (typeof res === 'object' && res !== null) {
              processData({ url: currentUrl, result: res });
            } else {
              // 否则按文本处理，处理二进制乱码
              if (res instanceof ArrayBuffer) {
                res = new TextDecoder('utf-8').decode(res);
              }
              processData({ url: currentUrl, result: JSON.parse(res) });
            }
          } catch (e) {
            console.error("❌ 解析数据失败:", e);
          }
        }
      }
      // 保持原有的逻辑不受影响
      if (oldOnReadyStateChange) {
        return oldOnReadyStateChange.apply(xhrInstance, arguments);
      }
    };

    return originalSend.apply(this, arguments);
  };

  function processData(json) {
    console.log("✅ 成功解析数据内容:", json);
    window.postMessage({ type: 'DOUYIN_DETAIL_DATA', payload: json }, '*');
  }

  // 同时保留 Fetch 拦截作为备份
  const { fetch: originalFetch } = window;
  window.fetch = async (...args) => {
    const url = args[0] instanceof URL ? args[0].href : (typeof args[0] === 'string' ? args[0] : '');
    const response = await originalFetch(...args);
    if (url.includes('/aweme/v1/web/aweme/detail')) {
      console.log("🎯 Fetch 命中目标:", url);
      const clone = response.clone();
      clone.json().then(data => processData({
        url,
        result: data
      })).catch(() => {});
    }
    return response;
  };
})();
