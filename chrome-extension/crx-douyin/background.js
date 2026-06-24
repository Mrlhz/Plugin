// import Dexie from './dexie.min.js';
import Dexie from './dexie.mjs';
import { AsyncQueue, createDownloadTask } from './AsyncQueue/index.js';

// ==========================================
// 🛡️ 状态追踪表与 Server.js 联动引擎
// ==========================================
const downloadRegistry = new Map(); // 存储格式：Map<filename, 'downloading'>
const SERVER_URL = 'http://localhost:8080/pathExists';

// 1. 全局初始化工业级下载队列（设置并发为 3）
const downloadQueue = new AsyncQueue(3, {
  onStatusChange: (status) => {
    console.log(`[💾 队列状态变动] 正在下载: ${status.activeCount} | 排队中: ${status.waitingCount} | 总数: ${status.totalCount} | 暂停: ${status.isPaused}`);
    
    // 体验优化：实时在浏览器扩展图标上显示当前“排队+正在下载”的总任务数
    if (status.totalCount > 0) {
      chrome.action.setBadgeText({ text: String(status.totalCount) });
      chrome.action.setBadgeBackgroundColor({ color: status.isPaused ? '#FF9500' : '#007AFF' });
    } else {
      chrome.action.setBadgeText({ text: '' }); // 队列全空时清空角标
    }
  }
});

// 1. 初始化并配置高效的 IndexedDB 复合索引数据库
const db = new Dexie('DouyinMediaDB');
db.version(1).stores({
  media: 'aweme_id, type, createTime, author.uid, [type+createTime]'
});

// ==========================================
// 2. 侦听内容脚本和一键触发逻辑
// ==========================================
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // 批量增量写入：存在则自动全覆盖更新(Upsert)，不存在则存入
  if (message.action === 'SAVE_BATCH_VIDEOS') {
    db.media.bulkPut(message.data)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  // 接收悬浮窗发来的批量下载指令
  if (message.action === 'DOWNLOAD_MEDIA_BATCH') {
    downloadMediaBatch(message.items);
    sendResponse({ success: true });
    return;
  }

  // ⏸️ 响应暂停指令
  if (message.action === 'QUEUE_PAUSE') {
    downloadQueue.pause();
    sendResponse({ success: true });
    return;
  }

  // ▶️ 响应恢复指令
  if (message.action === 'QUEUE_RESUME') {
    downloadQueue.resume();
    sendResponse({ success: true });
    return;
  }

  // 🛑 响应一键强杀清空指令
  if (message.action === 'QUEUE_CANCEL_ALL') {
    downloadQueue.cancelAll();
    sendResponse({ success: true });
    return;
  }
});

// ==========================================
// 3. 点击插件图标逻辑（精确路由识别 ➔ 单个下载）
// ==========================================
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.url || !tab.url.includes('douyin.com')) return;

  const currentAwemeId = extractAwemeIdFromUrl(tab.url);
  
  if (!currentAwemeId) {
    showActionBadge(tab.id, '❓', '#FF9500'); // 无法识别当前页面的视频/图文
    return;
  }

  try {
    const mediaItem = await db.media.get(currentAwemeId);
    if (!mediaItem) {
      showActionBadge(tab.id, '⏳', '#FFCC00'); // 尚未捕获到或由于重定向数据没到位
      return;
    }

    // 触发单个下载
    downloadMediaBatch([mediaItem]);
    showActionBadge(tab.id, 'OK', '#34C759');
  } catch (error) {
    showActionBadge(tab.id, 'ERR', '#FF3B30');
  }
});

/**
 * 🧭 抖音三种主流页面路由的黑盒解析器
 */
function extractAwemeIdFromUrl(urlStr) {
  try {
    const url = new URL(urlStr);
    const modalId = url.searchParams.get('modal_id');
    if (modalId && /^\d+$/.test(modalId)) return modalId;

    const match = url.pathname.match(/\/(video|note)\/(\d+)/);
    if (match && match[2]) return match[2];
    
    return null;
  } catch (e) {
    return null;
  }
}

// 按钮红绿状态徽章反馈
function showActionBadge(tabId, text, color) {
  chrome.action.setBadgeText({ text, tabId });
  chrome.action.setBadgeBackgroundColor({ color, tabId });
  setTimeout(() => chrome.action.setBadgeText({ text: '', tabId }), 2000);
}

// ==========================================
// 4. 原生分类目录并发下载层
// ==========================================
/**
 * 🧹 工业级可配置路径清洗函数
 * @param {string} str - 待清洗的原始文本（如作者昵称、视频文案）
 * @param {string} [invalidReplaceWith='_'] - 可选：系统违禁符的替换符号，默认 '_'
 * @param {string} [dotReplaceWith=''] - 可选：末尾点号替换符，默认 '' (直接剔除)
 */
function cleanString(str, invalidReplaceWith = '_', dotReplaceWith = '') {
  if (!str) return '';

  // 1. 创建动态的违禁符正则
  const invalidRegex = /[\\/:*?"<>|]/g;
  
  // 2. 创建匹配【最末尾所有点号】的正则
  const trailingDotRegex = /\.+$/g;

  let result = str
    .replace(/[\r\n\t]/g, ' ')                           // 换行/制表符变空格
    .replace(invalidRegex, invalidReplaceWith)           // 替换系统路径违禁符
    .replace(/^\s+|\s+$/g, '');                          // 首尾去空格

  // 3. 核心：根据配置处理末尾点号
  result = result.replace(trailingDotRegex, dotReplaceWith);

  // 4. 再次收尾去空格，防止剥离或替换点号后暴露出的新尾部带有空格
  result = result.replace(/^\s+|\s+$/g, '');

  // 5. 截取前30个字符，防止超长报错
  return result.substring(0, 30);
}


/**
 * 📥 批量下载入口：完美融入 AsyncQueue、本地磁盘深度扫描
 */
async function downloadMediaBatch(items) {
  let skipCount = 0;
  let pushCount = 0;

  for (const item of items) {
    let safeNickname = cleanString(item.author?.nickname) || '未知作者';
    let safeDesc = cleanString(item.desc) || item.aweme_id;
    const basePath = `Douyin_Grab/${safeNickname}/`;

    // 1. 处理视频类型
    if (item.type === 'video') {
      const videoUrl = item.downloadUrl || item.playUrl;
      if (!videoUrl) continue;

      const filename = `${basePath}${safeDesc}_${item.aweme_id}.mp4`;

      // 👑 调用升级后的三层深度校验
      const status = await checkDownloadStatus(filename, item);
      if (status) {
        console.log(`[去重拦截] 视频命中保护, 状态: ${status}, 路径: ${filename}`);
        skipCount++;
        continue;
      }

      pushTaskWithRetry({ url: videoUrl, filename, conflictAction: 'overwrite' }, 1);
      pushCount++;

    // 2. 处理图文类型
    } else if (item.type === 'note' && item.images?.length > 0) {
      for (let index = 0; index < item.images.length; index++) {
        const img = item.images[index];
        if (!img.url) continue;

        const filename = `${basePath}${safeDesc}_图文_${item.aweme_id}/image_${index + 1}.webp`;

        const status = await checkDownloadStatus(filename, item);
        if (status) {
          console.log(`[去重拦截] 图片命中保护, 跳过: ${filename}`);
          skipCount++;
          continue;
        }

        pushTaskWithRetry({ url: img.url, filename, conflictAction: 'uniquify' }, 0);
        pushCount++;
      }
    }
  }

  return { skipped: skipCount, pushed: pushCount };
}

/**
 * 🔍 工业级三层去重检查函数（加入 Node.js 离线实体硬盘检测）
 * @param {string} filename - 预落地的文件名相对路径
 * @param {Object} itemRaw - 原始的媒体项数据（用于传递给服务端）
 * @returns {Promise<string|null>} - 返回 'downloading' | 'completed' | 'server_exists' | null
 */
async function checkDownloadStatus(filename, itemRaw) {
  // 【第一层防线】：检查内存队列，判断是否正在下载中
  if (downloadRegistry.get(filename) === 'downloading') {
    return 'downloading';
  }

  // 【第二层防线】：检查 Chrome 原生下载记录（判断当前浏览器内该文件是否完好）
  const chromeCheck = await new Promise((resolve) => {
    chrome.downloads.search({ filename, state: 'complete', exists: true }, (res) => {
      resolve(res && res.length > 0 ? 'completed' : null);
    });
  });
  if (chromeCheck) return chromeCheck;

  // 【第三层防线】：👑 联动调用你的 Node.js 服务检测实体硬盘
  // 即使你重装了浏览器或清理了下载历史，只要硬盘里的文件还在，就能防重！
  try {
    const safeNickname = cleanString(itemRaw.author?.nickname, '_', '_') || '未知作者';
    const safeDesc = cleanString(itemRaw.desc, '_', '_') || itemRaw.aweme_id;

    // 拼装出契合你 server.js 的请求 Payload 格式
    const payload = [{
      filename: filename, // 传入相对路径
      downloadsLocation: [
        "D:\\Douyin_Downloads", // 👈 填写本地电脑上实际用来归档的绝对路径根目录
        "C:\\Users\\Administrator\\Downloads" // 或者是系统默认下载目录
      ],
      exts: [".mp4", ".webp", ".jpeg", ".jpg"] // 允许兼容检测的后缀
    }];

    // 异步发出 POST 请求
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const serverRes = await response.json();
      // 你的 server.js 逻辑：返回所有“不存在”的项。
      // 所以如果返回的 result 数组长度为 0，说明请求的项在硬盘里【已存在】
      if (serverRes.result && serverRes.result.length === 0) {
        return 'server_exists'; 
      }
    }
  } catch (err) {
    // 即使本地 Node 服务没启动，也顺延通过，保证插件降级后基本下载功能依然可用
    console.warn('[Server Link] 本地检测服务未启动或连接失败，自动跳过硬盘层校验。');
  }

  return null;
}

/**
 * 🛟 升级版：带状态注册的异步队列压入函数
 */
function pushTaskWithRetry(downloadOptions, currentPriority = 1, attempt = 1) {
  const { filename } = downloadOptions;

  // 1. 锁定状态：将其登记为“正在下载中”
  downloadRegistry.set(filename, 'downloading');

  const taskFn = createDownloadTask(downloadOptions);
  
  downloadQueue.push(taskFn, { timeout: 60000, priority: currentPriority })
    .then(() => {
      console.log(`[Registry] 任务成功落地: ${filename}`);
      // 下载成功后，可以保持或者清除，因为后续直接查磁盘即可
      downloadRegistry.delete(filename); 
    })
    .catch(err => {
      const errMsg = err.message || '';
      
      // 如果是被用户手动强杀或者取消的，解除锁定，允许未来重新点下载
      if (errMsg.includes('cancelled') || errMsg.includes('AbortSignal')) {
        downloadRegistry.delete(filename);
        return;
      }

      // 异常网络重试逻辑
      if (attempt < 3) {
        setTimeout(() => {
          pushTaskWithRetry(downloadOptions, 0, attempt + 1);
        }, 5000);
      } else {
        // 彻底失败，解除锁定，允许以后重试
        downloadRegistry.delete(filename);
        console.error(`[Registry] 任务彻底失败，已释放锁: ${filename}`);
      }
    });
}
