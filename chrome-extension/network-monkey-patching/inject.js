// 拦截 Fetch
const { fetch: originalFetch } = window;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  const clone = response.clone();

  clone.json().then(data => {
    window.postMessage({
      type: 'NET_LOG_DATA',
      url: args[0],
      method: args[1]?.method || 'GET',
      data: data
    }, '*');
  }).catch(() => {}); // 忽略非 JSON 响应

  return response;
};

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
    console.log("拦截到 XHR 请求内容:", postData);
    console.log("拦截到 XHR 响应内容:", this.responseText);

    window.postMessage({
      type: 'NET_LOG_DATA',
      url: this._url,
      method: this._method,
      data: this.responseText
    }, '*');
  });
  return send.apply(this, arguments);
};
