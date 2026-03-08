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
function getCoverImage() {
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

  const { ext } = pathParse(src);

  return { url: src, ext };
}

// 监听 background 或 popup 发来的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 使用 async IIFE (立即执行函数表达式) 来处理异步逻辑
  (async () => {
    try {
      if (message.action === 'getCoverImage') {
        console.log('content-script 收到消息：', message);

        // getImageAsDataUrl 返回一个 Promise
        const result = await getImageAsDataUrlPromise();
        // 成功：发送数据
        sendResponse(result);
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


/**
 * 将 <img> 转为 Data URL（绕过 CORS + Referer 限制）
 * 特点：
 * 1. 自动处理图片未加载完成的情况（监听 load 事件）
 * 2. 自动处理图片加载失败的情况（监听 error 事件）
 * 3. 包含超时保护，防止因图片永远不加载导致 Promise 挂起
 * 4. 返回完整的结果对象 { url, code, starName }
 */
function getImageAsDataUrlPromise(image = {}, timeoutMs = 10000) {
  const { url, ext } = getCoverImage();
  const { selector = '.screencap img' } = image;
  return new Promise((resolve, reject) => {
    const code = getCode();
    const star = getStar();
    const starName = star.length === 1 ? star[0]?.name : 'todo';
    
    const imgEl = document.querySelector(selector);

    if (!url) {
      return reject(new Error('Cover image URL not found'));
    }

    // 1. 基础检查：元素是否存在
    if (!imgEl) {
      return reject(new Error('Image element not found with selector: ' + selector)); // Image element (.screencap img) not found
    }

    // 2. 定义核心处理逻辑
    const processImage = () => {
      try {
        // 再次检查完整性（以防竞态条件）
        if (!imgEl.complete || imgEl.naturalWidth === 0) {
          return reject(new Error('Image loaded but invalid or empty'));
        }

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 设置画布尺寸
        canvas.width = imgEl.naturalWidth || imgEl.width;
        canvas.height = imgEl.naturalHeight || imgEl.height;
        
        // 绘制图片
        ctx.drawImage(imgEl, 0, 0);

        // 转换为 Blob
        canvas.toBlob((blob) => {
          if (!blob) {
            return reject(new Error('Failed to create blob from canvas'));
          }

          const reader = new FileReader();
          
          reader.onload = () => {
            resolve({
              images: [{ url: reader.result, cover: true, name: `${code}${ext}` }],
              av: code,
              // starName,
              star
            });
          };
          
          reader.onerror = () => {
            reject(new Error('FileReader failed to read blob'));
          };

          reader.readAsDataURL(blob);
        }, 'image/jpeg', 0.95);

      } catch (err) {
        reject(err);
      }
    };

    // 3. 状态判断与事件绑定
    if (imgEl.complete && imgEl.naturalWidth !== 0) {
      // 情况 A: 图片已加载完成，直接处理
      // 使用 setTimeout 确保异步执行，保持 Promise 行为一致
      setTimeout(processImage, 0);
    } else if (imgEl.error) {
      // 情况 B: 图片已经加载失败
      reject(new Error(`Image failed to load: ${imgEl.src}`));
    } else {
      // 情况 C: 图片正在加载中，绑定事件
      const onLoad = () => {
        cleanup();
        processImage();
      };

      const onError = () => {
        cleanup();
        reject(new Error(`Image failed to load during wait: ${imgEl.src}`));
      };

      imgEl.addEventListener('load', onLoad, { once: true });
      imgEl.addEventListener('error', onError, { once: true });

      // 清理函数：移除监听器，防止内存泄漏或重复触发
      const cleanup = () => {
        imgEl.removeEventListener('load', onLoad);
        imgEl.removeEventListener('error', onError);
        clearTimeout(timeoutTimer);
      };

      // 4. 超时保护
      const timeoutTimer = setTimeout(() => {
        cleanup();
        reject(new Error(`Timeout: Image did not load within ${timeoutMs}ms`));
      }, timeoutMs);
    }
  });
}


function imageUrlToBase64(url) {
  return new Promise((resolve, reject) => {
      const img = new Image();
      // 关键：允许跨域图片（如果图片源支持 CORS）
      img.crossOrigin = 'Anonymous'; 
      
      img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          
          // 默认输出为 image/png 格式
          const base64 = canvas.toDataURL('image/png');
          resolve(base64);
      };
      
      img.onerror = (err) => {
          reject(err);
      };
      
      img.src = url;
  });
}

// 使用示例
// const imgUrl = 'https://example.com/image.jpg';
// imageUrlToBase64(imgUrl)
//     .then(base64Str => {
//         console.log('转换成功:', base64Str);
//         // 此时 base64Str 格式如: "data:image/png;base64,iVBORw0KGgo..."
//     })
//     .catch(err => {
//         console.error('转换失败:', err);
//     });

// 非 Canvas 方案 (同样受 CORS 限制)
async function urlToBase64Fetch(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function pathParse(pathString) {
  if (typeof pathString !== 'string') {
    throw new TypeError("Parameter 'pathString' must be a string, not " + typeof pathString)
  }
  var allParts = win32SplitPath(pathString)
  if (!allParts || allParts.length !== 5) {
    throw new TypeError("Invalid path '" + pathString + "'")
  }
  return {
    root: allParts[1],
    dir: allParts[0] === allParts[1] ? allParts[0] : allParts[0].slice(0, -1),
    base: allParts[2],
    ext: allParts[4],
    name: allParts[3]
  }
  function win32SplitPath(filename) {
    const splitWindowsRe = /^(((?:[a-zA-Z]:|[\\\/]{2}[^\\\/]+[\\\/]+[^\\\/]+)?[\\\/]?)(?:[^\\\/]*[\\\/])*)((\.{1,2}|[^\\\/]+?|)(\.[^.\/\\]*|))[\\\/]*$/;
    return splitWindowsRe.exec(filename).slice(1)
  }
}
