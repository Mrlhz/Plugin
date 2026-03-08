console.log('content-script.js work!');

/**
 * @link https://stackoverflow.com/questions/9515704/use-a-content-script-to-access-the-page-context-variables-and-functions
 */
function injectCustomScript(jsPath) {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL(jsPath) // chrome-extension://xxxxxx/js/inject-script.js
  script.onload = function () {
    console.log('load')
    this.parentNode.removeChild(this)
  };
  (document.head || document.documentElement).appendChild(script);
}

injectCustomScript('js/inject-script.js')

// chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
//   console.log('消息：', request, sender, sendResponse)
//   const { cmd, result } = request
//   if (cmd === 'background_to_content') {
//     copyToClipboard(result.av ?? 'xx')
//   }
//   sendResponse({ message: '我是 content-script', request })
// })

/**
 * @description chrome 下复制到剪贴板
 * @param {*} text
 * @see https://github.com/zxlie/FeHelper/blob/15d3be06233106a2536601da06f5649eb39fc1ed/apps/json-format/format-lib.js#L179
 */
function copyToClipboard(text) {
  let input = document.createElement('textarea')
  input.style.position = 'fixed'
  input.style.opacity = 0
  input.value = text
  document.body.appendChild(input)
  input.select()
  document.execCommand('Copy')
  document.body.removeChild(input)
}


// content.js

/**
 * 获取封面图的绝对 URL（处理相对路径）
 */
function getCoverImageUrl() {
  const imgEl = document.querySelector('.screencap img');
  if (!imgEl) return null;

  let src = imgEl.getAttribute('src');
  if (!src) return null;

  // 如果是协议相对路径（//example.com/...）
  if (src.startsWith('//')) {
    src = location.protocol + src;
  }
  // 如果是相对路径（/xxx.jpg 或 xxx.jpg）
  else if (!src.startsWith('http')) {
    src = new URL(src, location.href).href;
  }

  return src;
}

/**
 * 将 <img> 转为 Data URL（绕过 CORS + Referer 限制）
 */
function getImageAsDataUrl(callback) {
  const code = getCode();
  const star = getStar();
  const starName = star.length === 1 ? star[0]?.name : 'todo';
  const imgEl = document.querySelector('.screencap img');
  if (!imgEl || !imgEl.complete) {
    // 图片未加载完成，等待 onload
    imgEl?.addEventListener('load', () => getImageAsDataUrl(callback), { once: true });
    return;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = imgEl.naturalWidth || imgEl.width;
  canvas.height = imgEl.naturalHeight || imgEl.height;
  ctx.drawImage(imgEl, 0, 0);

  canvas.toBlob(blob => {
    const reader = new FileReader();
    reader.onload = () => callback({ url: reader.result, code, starName }); // data:image/jpeg;base64,...
    reader.readAsDataURL(blob);
  }, 'image/jpeg', 0.95);
}

// 监听 background 或 popup 发来的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 使用 async IIFE (立即执行函数表达式) 来处理异步逻辑
  (async () => {
    try {
      if (message.action === 'getCoverImage') {
        console.log('content-script 收到消息：', message);
        
        const url = getCoverImageUrl();
        if (!url) {
          // 同步错误：直接返回
          sendResponse({ error: 'Cover image not found' });
          return;
        }

        // getImageAsDataUrl 返回一个 Promise
        const result = await getImageAsDataUrlPromise(url); 
        
        const filename = `${result.starName}/${result.code}/${result.code || 'cover'}.jpg`;
        
        // 成功：发送数据
        sendResponse({ url: result.url, filename });
      } else {
        // 未知动作
        sendResponse({ error: 'Unknown action' });
      }
    } catch (err) {
      console.log('Content script processing error:', err);
      // 异常：发送错误信息，防止端口关闭报错
      sendResponse({ error: err.message || 'Internal server error in content script' });
    }
  })();

  // 重要：返回 true 表示我们将异步发送响应
  return true;
});

/**
 * 辅助函数：getImageAsDataUrl 是旧式的回调风格，将其包装为 Promise
 */
function getImageAsDataUrlPromise(url) {
  return new Promise((resolve, reject) => {
    // 调用原有的回调风格函数
    getImageAsDataUrl((result) => {
      if (result && result.url) {
        resolve(result);
      } else {
        reject(new Error('Failed to get image data'));
      }
    });
    
    // 【可选】添加超时保护，防止回调永远不触发导致端口挂起
    // setTimeout(() => reject(new Error('Get image timeout')), 5000); 
  });
}



function getCode() {
  const code = document.querySelector("body > div.container > div.row.movie > div.col-md-3.info > p:nth-child(1) > span:nth-child(2)")?.innerText;
  if (code) {
    return code?.trim();
  };

  const { pathname } = window.location;
  return pathname.replace('/', '');
}

function getStar() {
  const getBase = (url, key) => { return /https?/.test(url) ? url.split(key)[1] : '' }
  // 演员
  const star = [...document.querySelectorAll('.genre a[href*="/star/"')].map((item) => {
    const url = item.getAttribute('href')
    return {
      name: item.innerText,
      url,
      base: getBase(url, '/star/')
    }
  });
  return star;
}