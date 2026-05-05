// 拦截 Fetch
(function() {
  const { fetch: originalFetch } = window;

  window.fetch = async (...args) => {
    const response = await originalFetch(...args);
    const url = args[0] instanceof URL ? args[0].href : args[0];

    // 精准匹配抖音详情接口
    if (url && url.includes('/aweme/v1/web/aweme/detail')) {
        const clone = response.clone();
        clone.json().then(data => {
            console.log("[拦截器] 捕获到视频数据:", data);
            // 发送给 Content Script
            window.postMessage({
                type: 'DOUYIN_DETAIL_DATA',
                url: url,
                payload: data
            }, '*');
        }).catch(err => console.error("解析失败:", err));
    }

    return response;
  };
  console.log("[拦截器] 已成功注入抖音页面");
})();


// 拦截 XHR 逻辑同理
const XHR = XMLHttpRequest.prototype;
const open = XHR.open;
const send = XHR.send;

XHR.open = function (method, url) {
  this._method = method;
  this._url = url;
  return open.apply(this, arguments);
};

XHR.send = function (postData) {
  this.addEventListener('load', function () {
    let responseData;

    try {
      // 根据 responseType 处理数据
      if (!this.responseType || this.responseType === 'text') {
        responseData = this.responseText;
      } else if (this.responseType === 'json') {
        responseData = this.response;
      } else if (this.responseType === 'arraybuffer' || this.responseType === 'blob') {
        // 如果是 arraybuffer，尝试转成文本字符串（针对 JSON 数据）
        const decoder = new TextDecoder('utf-8');
        responseData = decoder.decode(this.response);
      }

      // 尝试将字符串解析为 JSON 对象，方便后续逻辑处理
      if (typeof responseData === 'string') {
        try {
          responseData = JSON.parse(responseData);
        } catch (e) {
          // 说明不是 JSON 格式，保持原样
        }
      }

      console.log("拦截到 XHR 响应:", responseData);

      if (this._url && this._url.includes('/aweme/v1/web/aweme/detail')) {
        window.postMessage({
          type: 'DOUYIN_DETAIL_DATA',
          url: this._url,
          payload: responseData // 此时已是 JSON 对象或解码后的字符串
        }, '*');
      }
    } catch (err) {
      console.error("读取响应数据失败:", err);
    }
  });
  return send.apply(this, arguments);
};
