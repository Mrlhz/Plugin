// import Dexie from './dexie.min.js';
import Dexie from './dexie.mjs';
import { AsyncQueue, createDownloadTask } from './AsyncQueue/index.js';

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
 * 🧹 工业级文件名/路径强力清洗函数（彻底根治 Windows 路径末尾点号及空格报错）
 */
function cleanString(str) {
  if (!str) return '';
  return str
    .replace(/[\r\n\t]/g, ' ')               // 1. 换行/制表符变空格
    .replace(/[\\/:*?"<>|]/g, '_')           // 2. 抹除系统路径违禁符 \ / : * ? " < > |
    .replace(/^\s+|\s+$/g, '')               // 3. 去除全局首尾空格（防止尾部空格引发歧义）
    .replace(/\.+$/g, '')                    // 4. 使用正则强行剔除字符串【最末尾】的所有点号
    .replace(/^\s+|\s+$/g, '')               // 5. 再次收尾，确保剥离点号后暴露出的新尾部也没有空格
    .substring(0, 30);                       // 6. 截取前30个字符，防止超长报错
}


/**
 * 📥 批量下载入口：完美融入 AsyncQueue
 */
function downloadMediaBatch(items) {
  items.forEach((item) => {
    let safeNickname = cleanString(item.author?.nickname) || '未知作者';
    let safeDesc = cleanString(item.desc) || item.aweme_id;
    const basePath = `Douyin_Grab/${safeNickname}/`;

    // 1. 提取视频下载任务
    if (item.type === 'video') {
      const videoUrl = item.downloadUrl || item.playUrl;
      if (!videoUrl) return;

      const downloadOptions = {
        url: videoUrl,
        filename: `${basePath}${safeDesc}_${item.aweme_id}.mp4`,
        conflictAction: 'overwrite'
      };

      // 👑 核心：生成契合异步队列的任务函数，并塞入队列（设置 60 秒超时熔断）
      const taskFn = createDownloadTask(downloadOptions);
      downloadQueue.push(taskFn, { timeout: 60000, priority: 1 })
        .then(() => console.log(`[Queue] 视频 ${item.aweme_id} 下载成功`))
        .catch(err => console.error(`[Queue] 视频 ${item.aweme_id} 失败或被中止:`, err.message));

    // 2. 提取图文/笔记下载任务
    } else if (item.type === 'note' && item.images?.length > 0) {
      item.images.forEach((img, index) => {
        if (!img.url) return;
        
        const downloadOptions = {
          url: img.url,
          filename: `${basePath}${safeDesc}_图文_${item.aweme_id}/image_${index + 1}.webp`,
          conflictAction: 'uniquify'
        };

        // 👑 同理塞入队列
        const taskFn = createDownloadTask(downloadOptions);
        downloadQueue.push(taskFn, { timeout: 30000, priority: 0 }) // 图文文件小，设置 30 秒超时
          .then(() => console.log(`[Queue] 图文 ${item.aweme_id} 第 ${index + 1} 张下载成功`))
          .catch(err => console.error(`[Queue] 图文 ${item.aweme_id} 第 ${index + 1} 张失败:`, err.message));
      });
    }
  });
}
