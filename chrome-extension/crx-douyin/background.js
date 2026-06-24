// import Dexie from './dexie.min.js';
import Dexie from './dexie.mjs';

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
function downloadMediaBatch(items) {
  items.forEach((item) => {
    const safeNickname = (item.author?.nickname || '未知作者').replace(/[\\/:*?"<>|]/g, '_');
    const safeDesc = (item.desc || item.aweme_id).substring(0, 15).replace(/[\\/:*?"<>|]/g, '_');
    const basePath = `Douyin_Grab/${safeNickname}/`;

    if (item.type === 'video') {
      const videoUrl = item.downloadUrl || item.playUrl;
      if (!videoUrl) return;

      chrome.downloads.download({
        url: videoUrl,
        filename: `${basePath}${safeDesc}_${item.aweme_id}.mp4`,
        conflictAction: 'overwrite'
      });
    } else if (item.type === 'note' && item.images?.length > 0) {
      item.images.forEach((img, index) => {
        if (!img.url) return;
        chrome.downloads.download({
          url: img.url,
          filename: `${basePath}${safeDesc}_图文_${item.aweme_id}/image_${index + 1}.webp`,
          conflictAction: 'uniquify'
        });
      });
    }
  });
}
