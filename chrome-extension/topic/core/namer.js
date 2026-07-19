// namer.js / taskGenerator.js

import { cleanString, extractFileName } from './cleaner.js';

/**
 * 📂 统一多媒体任务归一化生成器
 * @param {Object} aweme - 原始抓取的媒体对象
 * @param {Object} options - 外部控制配置项
 * @param {boolean} [options.downloadAudio=false] - 是否同步提取原声BGM
 * @returns {Array<Object>} 经过规范化封装的标准下载任务弹夹数组
 */
export function generateMediaTasks(cleanedItem = {}, options = { downloadAudio: false }) {
  const { id: itemId, platform, tasks = [] } = cleanedItem;
  const finalTasks = [];

  tasks.forEach((subTask) => {
    // 💡 无论哪个平台，直接调用 subTask 自带的 getFilename() 核心工厂函数
    const relativePath = subTask.filename || `${platform}/${itemId}/${subTask.subId}`; // 极端情况下的兜底策略

    finalTasks.push({
      itemId,
      platform,
      subId: subTask.subId,
      type: subTask.type,
      urlCandidates: subTask.urlCandidates,
      currentUrlIndex: 0,
      filename: relativePath, // 完美的解耦文件名
      conflictAction: 'overwrite',
      priority: subTask.priority ?? 1
    });
  });

  return finalTasks;
}

// ==========================================
// 🎯 1. 策略模式：定义资产子处理器基类及具体实现
// ==========================================
class AssetProcessor {
  /**
   * 判断当前文章数据中是否存在该类型的资产
   */
  canProcess(article) { return false; }
  /**
   * 执行解析并向 subTasks 数组注入标准任务
   */
  process(article, context, subTasks) { throw new Error('Must implement process()'); }

  // 提取文件名的公共工具方法
  _extractFilename(urlStr, defaultName) {
    return extractFileName(urlStr, defaultName);
  }
}

// 📄 HTML 资产处理器
class HtmlProcessor extends AssetProcessor {
  canProcess(article) { return !!(article.htmlUrl || article.sourceUrl); }
  process(article, context, subTasks) {
    const url = article.htmlUrl || article.sourceUrl;
    subTasks.push({
      subId: `${article.id}_main_html`,
      type: 'html',
      urlCandidates: [url],
      currentUrlIndex: 0,
      filename: `${context.baseDir}/${context.safeTitle}.html`,
      priority: 10
    });
  }
}

// 🖼️ 图片资产处理器
class ImageProcessor extends AssetProcessor {
  canProcess(article) { return Array.isArray(article.images) && article.images.length > 0; }
  process(article, context, subTasks) {
    article.images.forEach((imgUrl, index) => {
      if (!imgUrl) return;
      const urlCandidates = [imgUrl];
      // if (article.imageBackupDomain && imgUrl.includes(article.originalDomain)) {
      //   urlCandidates.push(imgUrl.replace(article.originalDomain, article.imageBackupDomain));
      // }
      const fileBaseName = this._extractFilename(imgUrl, `img_${index}.jpg`);
      const isGif = fileBaseName.toLowerCase().endsWith('.gif');

      subTasks.push({
        subId: `${context.id}_img_${index}`,
        type: 'image',
        urlCandidates,
        currentUrlIndex: 0,
        filename: `${context.baseDir}/images/${fileBaseName}`,
        priority: isGif ? 0 : 5
      });
    });
  }
}

// 1. 定义平台策略接口
class BasePlatformStrategy {
  parse(rawJson) { throw new Error('Must implement'); }
  async getDownloadUrls(id) { throw new Error('Must implement'); }
}

// 2. 针对具体平台进行实现
// class DouyinStrategy extends BasePlatformStrategy {
//   parse(raw) {
//     return {
//       id: raw.aweme_id,
//       platform: 'douyin',
//       title: raw.desc,
//       mediaType: raw.video ? 'video' : 'image',
//       urls: [raw.video?.play_addr?.url_list[0]],
//       raw: raw
//     };
//   }
// }

// class XhsStrategy extends BasePlatformStrategy {
//   parse(raw) {
//     return {
//       id: raw.note_id,
//       platform: 'xhs',
//       title: raw.title || raw.desc,
//       mediaType: raw.type === 'video' ? 'video' : 'image',
//       urls: raw.imageList?.map(img => img.url) || [],
//       raw: raw
//     };
//   }
// }

export class BlogStrategy extends BasePlatformStrategy {
  constructor() {
    super();
    this.platform = 'blog';
    this.processors = [
      new HtmlProcessor(),
      new ImageProcessor()
    ];
  }

  parse(raw, options = {}) {
    const article = raw?.article || raw;
    const itemId = article?.id;
    if (!itemId) return null;

    // 使用 cleanString 确保文件名安全
    const safeAuthor = cleanString(article.author) || '未知博主';
    let rawTitle = cleanString(article.title) || '未命名文章';
    
    // 命名规则: `${title}__${id}`
    let mixTitle = `${rawTitle}__${itemId}`;
    // page 命名规则: `_page${page}`
    if (article.allPage) {
      mixTitle = `${mixTitle}_page${article.page || 1}`;
    }
    const safeTitle = mixTitle.replace(/[\\/:*?"<>|]/g, '_');

    const customDir = options.customDir || 'blog';
    // 统一输出目录：blog/博主名
    const baseDir = `${customDir}/${safeAuthor}`;

    // 统一上下文，供 HtmlProcessor 和 ImageProcessor 使用
    const context = {
      id: itemId,
      safeTitle,
      baseDir,
      htmlBlob: article.htmlBlob, // 供 HtmlProcessor 读取
      images: article.images || [], // 供 ImageProcessor 读取
    };

    const subTasks = [];

    // 多态分发：HtmlProcessor 处理文本，ImageProcessor 处理图片
    this.processors.forEach(processor => {
      if (processor.canProcess(article)) {
        processor.process(article, context, subTasks);
      }
    });

    return {
      platform: this.platform,
      id: String(itemId),
      authorId: article.authorId || 'unknown',
      authorName: safeAuthor,
      title: safeTitle,
      tasks: subTasks,
      raw
    };
  }
}


// 3. 工厂函数：根据平台返回对应策略实例
// export function getPlatformStrategy(platform) {
//   switch (platform) {
//     case 'douyin':
//       return new DouyinStrategy();
//     case 'xhs':
//       return new XhsStrategy();
//     case 'blog':
//       return new BlogStrategy();
//     default:
//       throw new Error(`Unsupported platform: ${platform}`);
//   }
// }
