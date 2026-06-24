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
let grabbedPool = []; // 本次打开页面新抓取到的去重数据池

function injectFloatingWidget() {
  if (document.getElementById('dy-batch-download-widget')) return;

  const widget = document.createElement('div');
  widget.id = 'dy-batch-download-widget';
  widget.style.cssText = `
    position: fixed; bottom: 120px; right: 40px; z-index: 2147483647;
    background: #161823; color: #fff; border: 1px solid rgba(255,255,255,0.15);
    padding: 12px 22px; border-radius: 30px; cursor: pointer;
    box-shadow: 0 8px 24px rgba(0,0,0,0.3); font-weight: bold; font-size: 14px;
    display: flex; align-items: center; gap: 8px; user-select: none; transition: all 0.2s ease;
  `;
  widget.innerHTML = `📥 一键打包批量下载 (<span id="dy-widget-count" style="color:#face15;">0</span>)`;

  widget.addEventListener('mouseenter', () => widget.style.transform = 'translateY(-2px)');
  widget.addEventListener('mouseleave', () => widget.style.transform = 'translateY(0)');

  widget.addEventListener('click', () => {
    if (grabbedPool.length === 0) {
      alert('当前可下载队列为空，请向下滚动网页加载更多作品！');
      return;
    }
    // 发送给 Background 执行静默批量下载
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

  document.body.appendChild(widget);
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
