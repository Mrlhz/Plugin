
import { createPlaceholderSvg, pathParse } from './utils.js';
import { IMAGE_RESOURCE_MAP } from './emojiDict.js';
import { 
  COMMANDS,
  TOPIC_KEY,
  FAVICON_TAG,
  STYLES_ALL,
  STYLES_SIMPLE,
  STYLES_ELEMENT,
  DEFAULT_IMAGES
} from './constants.js';

/**
 * ============================================================================
 * 静态页面构建器 (PageBuilder) - 采用管道清洗设计
 * ============================================================================
 */
class PageBuilder {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * 外部主入口：批量异步处理数据
   */
  static async buildCollection(items = [], options = {}) {
    const builder = new PageBuilder(options);
    // 使用 Promise.all 并行处理，大幅度提高多文章转换速度
    return Promise.all(items.map(item => builder.buildSinglePage(item)));
  }

  /**
   * 单条数据处理控制流
   */
  async buildSinglePage(element) {
    const rawText = element[TOPIC_KEY] || '';
    
    // 1. 生成原始 Markdown/Text Blob
    element.blob = this.createBlobUrl(rawText, "text/markdown");

    // 2. 预处理文本（如插入作者信息）
    let processedHtmlText = rawText;
    if (!this.options.allPage) {
      processedHtmlText = this.injectAuthorHeader(processedHtmlText, element);
    }

    // 3. 转换为 DOM 进行清洗与重构
    const container = document.createElement('div');
    container.innerHTML = processedHtmlText;

    // 4. 执行一系列 DOM 清洗管道 (Pipeline)
    this.sanitizeLinks(container, element.url);
    this.removeAdvertisements(container);
    this.removeSecurityRisks(container);
    
    // 5. 替换图片资源并获取动态样式计数
    const imageCountMap = this.optimizeImages(container);

    // 6. 组装最终的 HTML 结构并生成 Blob
    const finalHtmlString = this.assembleHtml(container.innerHTML, imageCountMap);
    element.htmlBlob = this.createBlobUrl(finalHtmlString, "text/html");

    return element;
  }

  /**
   * 通用 Blob URL 生成器
   */
  createBlobUrl(content, type) {
    const blob = new Blob([content], { type });
    return URL.createObjectURL(blob);
  }

  /**
   * 注入作者信息到正文头部
   */
  injectAuthorHeader(htmlText, { author, authorLink }) {
    if (!author) return htmlText;
    
    const container = document.createElement('div');
    container.innerHTML = htmlText;
    const targetNode = container.querySelector('.t_msgfontfix');
    
    if (!targetNode) return htmlText;

    const authorWrapper = document.createElement('p');
    authorWrapper.innerHTML = `<a href="${authorLink}" class="posterlink" target="_blank">${author}</a><br>`;

    if (targetNode.firstChild) {
      targetNode.insertBefore(authorWrapper, targetNode.firstChild);
    } else {
      targetNode.appendChild(authorWrapper);
    }
    return container.innerHTML;
  }

  /**
   * 管道1：格式化并修复相对路径超链接
   */
  sanitizeLinks(container, topicUrl) {
    if (!topicUrl) return;
    try {
      const { origin } = new URL(topicUrl);
      container.querySelectorAll('a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
          link.setAttribute('href', `${origin}/${href}`);
          link.setAttribute('target', '_blank');
        }
      });
    } catch (e) {
      console.warn('Invalid topic URL:', topicUrl);
    }
  }

  /**
   * 管道2：移除广告节点
   */
  removeAdvertisements(container) {
    container.querySelector('#ad_thread1_0')?.remove();
  }

  /**
   * 管道3：安全性清洗（移除脚本、外链样式和危险的内联事件）
   */
  removeSecurityRisks(container) {
    // 移除所有 script 标签
    container.querySelectorAll('script').forEach(el => el.remove());
    
    // 移除所有外部 link 样式
    container.querySelectorAll('link').forEach(el => el.remove());

    // 移除 XSS 风险的属性
    const dangerousAttrs = ['onmouseover', 'onclick', 'onload'];
    container.querySelectorAll('*').forEach(el => {
      dangerousAttrs.forEach(attr => {
        if (el.hasAttribute(attr)) el.removeAttribute(attr);
      });
    });
  }

  /**
   * 管道4：图片资源本地化与 Base64 变量重构
   */
  optimizeImages(container) {
    const countMap = {};
    
    container.querySelectorAll('img').forEach(image => {
      let src = image.getAttribute('src');
      // 处理懒加载或特定论坛的 file 属性
      if (src?.endsWith('none.gif') && image.getAttribute('file')) {
        src = image.getAttribute('file');
      }

      if (!src) return;

      // 提取文件名 (用正则替代未提供的 pathParse 逻辑)
      // const base = src.substring(src.lastIndexOf('/') + 1);
      const { base } = pathParse(src);
      const localImage = IMAGE_RESOURCE_MAP[base];

      if (localImage) {
        // 核心改动：转换为占位图 + CSS 变量背景，实现高保真度和小体积
        image.classList.add('sf-img');
        image.setAttribute('src', createPlaceholderSvg(localImage.pxWidth || 16, localImage.pxHeight || 16));
        
        const cssVarName = `--${base.replaceAll('.', '_')}`;
        image.setAttribute('style', `background-image: var(${cssVarName})!important;`);
        
        countMap[base] = (countMap[base] || 0) + 1;
      } else if (!DEFAULT_IMAGES.includes(base)) {
        // 普通图片重定向到本地相对路径
        image.setAttribute('src', `images/${base}`);
      }
    });

    return countMap;
  }

  /**
   * 管道5：装配最终页面 HTML
   */
  assembleHtml(bodyHtml, imageCountMap) {
    const styles = [];

    if (this.options.allPage) {
      const rootStyles = [];
      Object.keys(imageCountMap).forEach(key => {
        if (imageCountMap[key] > 0 && IMAGE_RESOURCE_MAP[key]) {
          const varName = `--${key.replaceAll('.', '_')}`;
          rootStyles.push(`${varName}: url("${IMAGE_RESOURCE_MAP[key].content}")`);
        }
      });

      styles.push(`<style>:root{ ${rootStyles.join(';')} }</style>`);
      styles.push(STYLES_ELEMENT);
      styles.push(STYLES_ALL);
    } else {
      styles.push(STYLES_SIMPLE);
    }

    return `<head>${FAVICON_TAG}${styles.join('')}</head><body>${bodyHtml}</body>`;
  }
}


/**
 * ============================================================================
 * Chrome 运行期事件监听 (Runtime Message Listener)
 * ============================================================================
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Offscreen 收到消息：', request);
  const { cmd, result, options } = request;

  // 映射指令和返回指令
  const cmdMap = {
    [COMMANDS.BG_TO_OFFSCREEN]: COMMANDS.OFFSCREEN_TO_BG,
    [COMMANDS.BG_TO_OFFSCREEN_SINGLE]: COMMANDS.OFFSCREEN_TO_BG_SINGLE
  };

  if (cmdMap[cmd]) {
    // 触发异步处理流
    PageBuilder.buildCollection(result, options)
      .then(processedResult => {
        chrome.runtime.sendMessage({ 
          cmd: cmdMap[cmd], 
          result: processedResult, 
          options 
        });
      })
      .catch(err => console.warn('页面重构失败:', err));
  }

  // 关键改动：向发送方同步确认收到。
  // 注意：因为后续的 PageBuilder 是向 background 主动发新消息，这里的 response 仅作“收到收条”使用
  sendResponse({ message: 'Offscreen 已收到任务并开始后台处理。', request });
  // return false;
});
