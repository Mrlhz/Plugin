console.log("🔗 插件 Content Script 已注入...");

// ==========================================
// 1. 动态注入外部劫持脚本
// ==========================================
try {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('inject.js');
  script.onload = function() { this.remove(); };
  (document.head || document.documentElement).appendChild(script);
} catch (e) {
  console.error("注入失败:", e);
}

// ==========================================
// 2. 局部变量与悬浮窗 UI 构建
// ==========================================

let grabbedPool = []; // 本次页面生命周期内捕获的数据池
let isQueuePaused = false; // 本地记录的队列暂停状态

function injectFloatingWidget() {
  if (document.getElementById('dy-control-panel-widget')) return;

  // 1. 创建总控制台外壳
  const panel = document.createElement('div');
  panel.id = 'dy-control-panel-widget';
  panel.style.cssText = `
    position: fixed; bottom: 120px; right: 40px; z-index: 2147483647;
    display: flex; align-items: center; gap: 8px; background: #161823;
    padding: 8px 14px; border-radius: 30px; border: 1px solid rgba(255,255,255,0.15);
    box-shadow: 0 8px 24px rgba(0,0,0,0.4); user-select: none; font-family: sans-serif;
  `;

  // 2. 内部按钮 HTML 结构（批量下载主按钮 + 状态切换按钮 + 强杀清空按钮）
  panel.innerHTML = `
    <!-- 主按钮：触发下载 -->
    <div id="dy-btn-download" style="color: #fff; padding: 6px 14px; border-radius: 20px; background: linear-gradient(135deg, #fee140 0%, #fa709a 100%); font-weight: bold; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 4px; transition: transform 0.1s;">
      📥 下载当前页 (<span id="dy-widget-count">0</span>)
    </div>
    
    <!-- 垂直分割线 -->
    <div style="width: 1px; height: 16px; background: rgba(255,255,255,0.2);"></div>

    <!-- 辅助按钮：暂停/继续 -->
    <div id="dy-btn-pause" title="暂停/恢复下载队列" style="color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; transition: background 0.2s;">
      ⏸️
    </div>

    <!-- 辅助按钮：一键清空强杀 -->
    <div id="dy-btn-cancel" title="强杀当前下载并清空排队" style="color: #fff; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; cursor: pointer; transition: background 0.2s;">
      🛑
    </div>
  `;

  document.body.appendChild(panel);

  // 3. 获取各节点并绑定精致的交互动效与通信
  const btnDownload = document.getElementById('dy-btn-download');
  const btnPause = document.getElementById('dy-btn-pause');
  const btnCancel = document.getElementById('dy-btn-cancel');

  // 悬停动效显式微调
  [btnPause, btnCancel].forEach(b => {
    b.addEventListener('mouseenter', () => b.style.backgroundColor = 'rgba(255,255,255,0.15)');
    b.addEventListener('mouseleave', () => b.style.backgroundColor = '');
  });
  btnDownload.addEventListener('mouseenter', () => btnDownload.style.transform = 'scale(1.03)');
  btnDownload.addEventListener('mouseleave', () => btnDownload.style.transform = 'scale(1)');

  // 核心功能 A：一键打包批量下载
  btnDownload.addEventListener('click', () => {
    if (grabbedPool.length === 0) {
      alert('📌 当前可下载队列为空，请向下滚动网页加载更多作品！');
      return;
    }
    chrome.runtime.sendMessage({
      action: 'DOWNLOAD_MEDIA_BATCH',
      items: grabbedPool
    }, (response) => {
      if (response?.success) {
        grabbedPool = [];
        document.getElementById('dy-widget-count').innerText = '0';
      }
    });
  });

  // 核心功能 B：暂停 / 恢复切换
  btnPause.addEventListener('click', () => {
    isQueuePaused = !isQueuePaused;
    const targetAction = isQueuePaused ? 'QUEUE_PAUSE' : 'QUEUE_RESUME';
    
    chrome.runtime.sendMessage({ action: targetAction }, (response) => {
      if (response?.success) {
        // 根据状态动态更新网页图标，给用户明确反馈
        btnPause.innerHTML = isQueuePaused ? '▶️' : '⏸️';
        btnPause.title = isQueuePaused ? '恢复下载队列' : '暂停下载队列';
        btnDownload.style.opacity = isQueuePaused ? '0.6' : '1';
      }
    });
  });

  // 核心功能 C：一键强杀全部取消
  btnCancel.addEventListener('click', () => {
    if (confirm('⚠️ 确定要强杀当前所有正在下载的任务，并清空所有排队吗？')) {
      chrome.runtime.sendMessage({ action: 'QUEUE_CANCEL_ALL' }, (response) => {
        if (response?.success) {
          // 状态重置
          isQueuePaused = false;
          btnPause.innerHTML = '⏸️';
          btnDownload.style.opacity = '1';
          alert('🛑 队列已被安全强杀清空，并发计数器已复位！');
        }
      });
    }
  });
}

// 页面加载完成后注入按钮
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectFloatingWidget);
} else {
  injectFloatingWidget();
}

// ==========================================
// 3. 消息侦听与清洗过滤器
// ==========================================
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data || event.data.type !== 'DOUYIN_DETAIL_DATA') return;

  const { url, result } = event.data.payload;
  let newItems = [];

  if (url.includes('/aweme/v1/web/aweme/detail')) {
    const raw = result.aweme_detail || result;
    if (raw?.aweme_id) newItems.push(cleanRawAweme(raw));
  } else if (url.includes('/aweme/v1/web/aweme/post')) {
    (result.aweme_list || []).forEach(raw => {
      if (raw?.aweme_id) newItems.push(cleanRawAweme(raw));
    });
  }

  // 1. 同步提交至后台进行高速 IndexedDB 增量 Upsert 存储
  if (newItems.length > 0) {
    chrome.runtime.sendMessage({ action: 'SAVE_BATCH_VIDEOS', data: newItems });
  }

  // 2. 更新内存中用于前端按钮一键下载的捕获池
  newItems.forEach(item => {
    if (!grabbedPool.some(existing => existing.aweme_id === item.aweme_id)) {
      grabbedPool.push(item);
    }
  });

  const countEl = document.getElementById('dy-widget-count');
  if (countEl) countEl.innerText = grabbedPool.length;
});

/**
 * 🧹 数据结构自适应映射器
 */
function cleanRawAweme(raw) {
  const isNote = raw.images && raw.images.length > 0;
  const baseData = {
    aweme_id: String(raw.aweme_id),
    type: isNote ? 'note' : 'video',
    desc: raw.desc || '',
    author: {
      nickname: raw.author?.nickname || '匿名作者',
      uid: String(raw.author?.uid || '')
    },
    coverUrl: raw.video?.cover?.url_list?.[0] || raw.images?.[0]?.url_list?.[0] || '',
    createTime: raw.create_time || Math.floor(Date.now() / 1000),
    capturedAt: new Date().toISOString()
  };

  if (isNote) {
    return {
      ...baseData,
      images: raw.images.map(img => ({ url: img.url_list?.[0] || '', height: img.height || 0, width: img.width || 0 })),
      playUrl: '', downloadUrl: '', downloadUrls: [], duration: 0
    };
  } else {
    const urlList = raw.video?.play_addr?.url_list || [];
    return {
      ...baseData,
      images: [],
      playUrl: urlList[0] || '',
      downloadUrl: urlList[0] || '',
      downloadUrls: urlList,
      duration: raw.video?.duration || 0,
      ratio: raw.video?.ratio || 'default'
    };
  }
}
