(function () {
  // 1. 定义私有变量和函数
  const _porn_images = []

  const imagesSet = Object.fromEntries(new Map(_porn_images.map(image => [image.url, image.content])));

  /**
   * @description Node.js path.parse(pathString) ponyfill.
   * @link https://github.com/jbgutierrez/path-parse
   * @export
   * @param {*} pathString
   * @returns
   * {
   *   root : '/',
   *   dir : '/home/user/dir',
   *   base : 'file.txt',
   *   ext : '.txt',
   *   name : 'file'
   *  }
   */
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

  /**
   * 获取页面中的图片列表，支持自定义过滤条件
   * @param {Object|Function|null} filter - 可选的过滤条件
   *   - 如果是对象：将检查图片属性是否包含该对象的所有键值对 (浅比较)
   *   - 如果是函数：该函数接收图片元素作为参数，返回 true 则保留
   *   - 如果是 null/undefined：返回所有图片
   * @returns {Array<Object>} 包含图片信息的对象数组
   * @example
   * // 获取所有图片
   * const allImages = getImageList();
   *
   * // 获取 src 包含 "avatar" 的图片
   * const avatarImages = getImageList({ src: "avatar" });
   * 
   * // 获取 pathname 以 "/images/" 开头的图片
   * const smiliesImages = getImageList({ pathname: '/images/' });
   * 
   * // 使用自定义函数过滤，例如只保留宽度大于 100px 的图片
   * const largeImages = getImageList(img => parseFloat(window.getComputedStyle(img).getPropertyValue('width')) > 100);
   * 
   */
  function getImageList(filter = null) {
    // 1. 获取所有 img 元素
    const allImages = [...document.querySelectorAll('img')];

    // 2. 定义过滤逻辑
    const filteredImages = allImages.filter(img => {
      const src = img.getAttribute('src');
      if (!src) return false;

      // 尝试构建 URL 对象以获取标准化路径 (处理相对路径)
      let urlObj = null;
      try {
        urlObj = new URL(src, window.location.href);
      } catch (e) {
        return false; // 无效的 URL
      }

      const pathname = urlObj.pathname;

      // 情况 A: 传入的是函数，直接执行函数判断
      if (typeof filter === 'function') {
        return filter(img);
      }

      // 情况 B: 传入的是对象，检查属性匹配
      if (typeof filter === 'object' && filter !== null) {
        // 简单匹配 src 或 pathname，可以根据需要扩展
        if (filter.src && !src.includes(filter.src)) return false;
        if (filter.pathname && !pathname.startsWith(filter.pathname)) return false;
        return true;
      }

      // 情况 C: 无过滤条件，全部保留
      return true;
    });

    // 3. 映射结果 (保留原有的数据结构)
    return filteredImages.map(e => {
      const src = e.getAttribute('src');
      const urlObj = new URL(src, window.location.href);
      const { pathname } = urlObj;

      return {
        pathname, // 路径名
        base: pathname.split('/').pop() || '', // 文件名
        url: urlObj.href, // 完整 URL
        pxWidth: e?.getBoundingClientRect()?.width, // 渲染宽度
        pxHeight: e?.getBoundingClientRect()?.height // 渲染高度
      };
    });
  }

  /**
   * 获取图片尺寸
   * 优先返回图片原始分辨率 (naturalWidth/Height)。
   * 如果图片未加载导致原始尺寸为 0，则计算其“内容盒”的渲染尺寸（去除 padding 和 border）。
   * 
   * @param {HTMLImageElement} imageElement - 图片 DOM 元素
   * @param {CSSStyleDeclaration} [computedStyle] - 可选的预计算样式对象，避免重复调用 getComputedStyle
   * @returns {{ pxWidth: number, pxHeight: number }} 包含宽高的对象
   * 
   * @example
   * const img = document.querySelector('img');
   * const size = getSize(img);
   * console.log(`图片尺寸：${size.pxWidth} x ${size.pxHeight}`);
   */
  function getSize(imageElement, computedStyle) {
    // 1. 优先获取原始分辨率 (Natural Size)
    // 只要图片加载成功，naturalWidth 通常就是我们要的真实像素
    let pxWidth = imageElement.naturalWidth;
    let pxHeight = imageElement.naturalHeight;

    // 2. 兜底逻辑：如果原始尺寸为 0 (例如图片还没加载完)，尝试计算渲染尺寸
    if (!pxWidth && !pxHeight) {
      // 记录修改前是否有 style 属性，以便后续清理（虽然优化版不再修改 DOM，但保留逻辑以备不时之需）
      const hadStyleAttribute = imageElement.hasAttribute("style");

      // 获取计算后的样式
      if (!computedStyle) {
        try {
          computedStyle = globalThis.getComputedStyle(imageElement);
        } catch (error) {
          // 元素可能已断开连接或无效，忽略错误
          return {
            pxWidth: 0,
            pxHeight: 0
          };
        }
      }

      if (computedStyle) {
        // --- 核心优化点 ---
        // 原代码通过临时修改 box-sizing 来探测 border，这有副作用。
        // 优化方案：直接使用 getBoundingClientRect() 获取总尺寸，
        // 然后减去 computedStyle 中的 padding 和 border 即可得到内容区域 (Content Box)。

        const rect = imageElement.getBoundingClientRect();

        // 提取数值 (parseFloat 会自动处理 "10px" -> 10)
        const padding = {
          left: parseFloat(computedStyle.paddingLeft) || 0,
          right: parseFloat(computedStyle.paddingRight) || 0,
          top: parseFloat(computedStyle.paddingTop) || 0,
          bottom: parseFloat(computedStyle.paddingBottom) || 0
        };

        const border = {
          left: parseFloat(computedStyle.borderLeftWidth) || 0,
          right: parseFloat(computedStyle.borderRightWidth) || 0,
          top: parseFloat(computedStyle.borderTopWidth) || 0,
          bottom: parseFloat(computedStyle.borderBottomWidth) || 0
        };

        // 计算内容区域宽高 = 总宽高 - 内边距 - 边框
        pxWidth = Math.max(0, rect.width - padding.left - padding.right - border.left - border.right);
        pxHeight = Math.max(0, rect.height - padding.top - padding.bottom - border.top - border.bottom);
      }
    }

    return {
      pxWidth,
      pxHeight
    };
  }

  class BatchRequest {
	  constructor() {
	  	this.requests = new Map();
	  	this.duplicates = new Map();
	  }

   addURL(url, { baseURI, groupDuplicates = false, contentType = '' } = {}) {
    // const requestKey = JSON.stringify({ url, baseURI, groupDuplicates, contentType });
    const requestKey = url; // 以 URL 作为唯一标识，简化重复请求的处理
    return new Promise((resolve, reject) => {
      let resourceRequests = this.requests.get(requestKey);
      if (!resourceRequests) {
        resourceRequests = [];
        this.requests.set(requestKey, resourceRequests);
      }
      const callbacks = { resolve, reject };
      resourceRequests.push(callbacks);
      
      if (groupDuplicates) {
        const duplicateRequests = this.duplicates.get(requestKey) || [];
        duplicateRequests.push(callbacks);
        this.duplicates.set(requestKey, duplicateRequests);
      }
    });
   }

   async runAll(onloadListener = () => {}, options) {
    const resourceURLs = Array.from(this.requests.keys());
    const total = resourceURLs.length;
    let completed = 0;
    const results = [];

    const tasks = resourceURLs.map(async url => {
			const resourceRequests = this.requests.get(url);
      try {
        const content = await fetchToDataUri(url, (loaded, total) => {
          console.log(`下载进度: ${url} - ${((loaded / total) * 100).toFixed(2)}%`);
        });
        if (typeof onloadListener === 'function') {
          await onloadListener(url, options);
        }
        results.push({ url, content });
        if (!this.cancelled) {
          resourceRequests.forEach(({ resolve }) => resolve({ url, content }));
        }
      } catch (error) {
        if (typeof onloadListener === 'function') {
          await onloadListener(url, options);
        }
        if (!this.cancelled) {
          resourceRequests.forEach(({ reject }) => reject(error));
        }
      } finally {
        this.requests.delete(url);
        completed++;
        if (completed === total) {
          console.log('所有资源请求已完成');
        }
      }
    });

    await Promise.all(tasks);
    return results;
   }

   cancelAll() {
		this.cancelled = true;
    this.requests.forEach((callbacks, url) => {
      callbacks.forEach(({ reject }) => reject(new Error('请求已取消')));
    });
    this.requests.clear();
    this.duplicates.clear();
   }
  }

  /**
   * 下载资源并转换为 Data URI (Base64)
   * @param {string} url - 资源地址 (图片/字体等)
   * @param {function} onProgress - 进度回调 (loaded, total)
   * @returns {Promise<string>} - 返回 Base64 字符串 (如 "data:image/png;base64,...")
   */
  async function fetchToDataUri(url, onProgress) {
    try {
      // 1. 发起请求
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`下载失败: ${response.status}`);
      }
    
      // 2. 获取总大小用于计算进度
      const contentLength = response.headers.get('content-length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;
      let loaded = 0;
    
      // 3. 处理流以监控进度
      const reader = response.body.getReader();
      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader.read().then(({ done, value }) => {
              if (done) {
                controller.close();
                return;
              }
              loaded += value.length;
              // 汇报进度
              if (onProgress) onProgress(loaded, total);
              controller.enqueue(value);
              push();
            });
          }
          push();
        }
      });
    
      // 4. 将流重新组合成 Blob
      // 注意：这里不能用 response.blob()，因为流已经被我们拦截了
      const newResponse = new Response(stream);
      const blob = await newResponse.blob();
    
      // 5. 将 Blob 转换为 Data URI
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    
    } catch (error) {
      console.log('转换 Data URI 失败:', error);
    }
    return null;
  }

  /**
   * 过滤掉 src 属性重复的图片元素
   * @param {HTMLImageElement[]} images - 图片元素数组
   * @returns {HTMLImageElement[]} 去重后的图片元素数组
   */
  function filterDuplicateImages(images = []) {
    const seenSrcs = new Set(); // 用于存储已经出现过的图片 src
  
    return images.filter(img => {
      const src = img.src;
      if (seenSrcs.has(src)) {
        // 如果这个 src 已经存在，说明是重复图片，过滤掉
        return false;
      } else {
        // 如果是第一次见到这个 src，将其加入 Set 并保留该图片
        seenSrcs.add(src);
        return true;
      }
    });
  }

  async function make() {
    // 预先获取图片列表
    const images = filterDuplicateImages([...document.querySelectorAll('img')]).filter(img => {
      const src = img.getAttribute('src');
      if (!src) return false;
      let urlObj = null;
      try {
        urlObj = new URL(src, window.location.href);
      } catch (e) {
        return false; // 无效的 URL
      }
      const { pathname, href: url } = urlObj;
      // 只处理路径以 /images/ 开头且不在 imagesSet 中的图片
      return pathname.startsWith('/images/') && imagesSet[url] === undefined;
    });

    const urls = images.map(img => {
      const src = img.getAttribute('src');
      try {
        const { pathname, href: url } = new URL(src, window.location.href);
        return {
          url,
          content: null, // 这里先不处理 content，等 fetchToDataUri 后再填充
          base: pathname.split('/').pop() || '',
          pathname,
          ...getSize(img)
        };
      } catch (e) {
        return null; // 无效的 URL
      }
    });

    const batchRequest = new BatchRequest();
    urls.forEach(({ url }) => {
      batchRequest.addURL(url, { groupDuplicates: false });
    });

    const results = await batchRequest.runAll((url, options) => {
      console.log(`资源加载完成: ${url}`);
    }, { /* 可选参数 */ }).then(results => {
      console.log('所有资源已处理:', results);
      return results;
    }).catch(error => {
      console.error('资源处理过程中发生错误:', error);
    });

    // 将对应content更新到urls
    const contentMap = new Map(results.map(item => [item.url, item.content]));
    urls.forEach((item) => {
      if (contentMap.has(item.url)) {
        item.content = contentMap.get(item.url);
      }
    });

    return urls;
  }

  // 2. 将需要暴露的内容挂载到全局对象
  // 在浏览器中，this 指向 window
  this.__MY_EXTENSION_GLOBAL__ = {
    version: '1.0.0',
    config: {
      debug: true
    },
    _porn_images,
    imagesSet,
    pathParse,
    getImageList,
    getSize,
    BatchRequest,
    fetchToDataUri,
    filterDuplicateImages,
    make
  };

  // Object.freeze(this.__MY_EXTENSION_GLOBAL__); // 冻结对象，防止被修改
  // Object.defineProperty(this, '__MY_EXTENSION_GLOBAL__', { writable: false, configurable: false }); // 防止重新赋值

  Object.defineProperty(this, '__M__', {
    get() {
      return this.__MY_EXTENSION_GLOBAL__;
    },
    set(value) {
      this.__MY_EXTENSION_GLOBAL__ = value;
    },
    configurable: true,
    enumerable: true
  });

}).call(this); // 使用 .call(this) 确保函数内部的 this 指向全局对象
