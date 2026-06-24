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
      showToast('📌 当前可下载队列为空，请向下滚动网页加载更多作品！', 'info');
      return;
    }
    chrome.runtime.sendMessage({
      action: 'DOWNLOAD_MEDIA_BATCH',
      items: grabbedPool
    }, (response) => {
      if (response?.success) {
        const { skipped, pushed } = response;
      
        // 智能化弹窗播报
        if (skipped > 0 && pushed === 0) {
          showToast(`⚡ 请求的 ${skipped} 项内容在本地均已存在，已全部智能拦截跳过！`, 'warning', 4000);
        } else if (skipped > 0 && pushed > 0) {
          showToast(`✅ 打包成功！新提交下载: ${pushed} 项，智能自动过滤已存在项: ${skipped} 项。`, 'success', 5000);
        } else {
          showToast(`🚀 成功！本次共提交 ${pushed} 项下载任务进入异步自愈队列。`, 'success', 3500);
        }

        // 清空本地采集池
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


// ==========================================
// 🔔 轻量级动态 Toast 提示控件引擎
// ==========================================

/**
 * 弹出全局气泡通知
 * @param {string} text - 提示文本内容
 * @param {'success' | 'warning' | 'error' | 'info'} type - 提示类型
 * @param {number} [duration=3000] - 显示持续时间（毫秒）
 */
function showToast(text, type = 'info', duration = 3000) {
  // 1. 确保并创建全局 Toast 垂直容器（固定在网页右侧中部）
  let container = document.getElementById('dy-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'dy-toast-container';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      right: 20px;
      transform: translateY(-50%);
      z-index: 2147483647; /* 保证绝对置顶 */
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none; /* 防止阻挡用户鼠标点击页面背景 */
    `;
    document.body.appendChild(container);
  }

  // 2. 根据不同的业务状态匹配精致的渐变主题颜色和图标
  let bgTheme = 'linear-gradient(135deg, #2196F3 0%, #00BCD4 100%)'; // 默认 info
  let icon = 'ℹ️';
  
  if (type === 'success') {
    bgTheme = 'linear-gradient(135deg, #424242 0%, #111111 100%)'; // 炫酷暗黑成功态
    icon = '✅';
  } else if (type === 'warning') {
    bgTheme = 'linear-gradient(135deg, #FF9800 0%, #F44336 100%)'; // 警告高亮（适合去重拦截）
    icon = '⚡';
  } else if (type === 'error') {
    bgTheme = 'linear-gradient(135deg, #f857a6 0%, #ff5858 100%)'; // 错误态
    icon = '❌';
  }

  // 3. 动态创建单个气泡节点
  const toast = document.createElement('div');
  toast.style.cssText = `
    min-width: 240px;
    max-width: 320px;
    background: ${bgTheme};
    color: #fff;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 13px;
    font-weight: bold;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    box-shadow: 0 10px 30px rgba(0,0,0,0.25);
    display: flex;
    align-items: center;
    gap: 10px;
    opacity: 0;
    transform: translateX(50px) scale(0.9);
    transition: all 0.35s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    pointer-events: auto; /* 让气泡自身支持交互 */
    line-height: 1.4;
  `;
  toast.innerHTML = `<span>${icon}</span><div style="flex-grow:1;">${text}</div>`;

  // 将新气泡压入容器展示
  container.appendChild(toast);

  // 4. 触发淡入及弹簧滑入动效（顺延 10 毫秒确保 DOM 渲染就绪）
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(0) scale(1)';
  }, 10);

  // 5. 声明安全销毁定时器
  const destroyTimer = setTimeout(dismiss, duration);

  // 6. 交互小优化：用户鼠标悬停时保持显示，移开后重新计时销毁
  let remainTimer = destroyTimer;
  toast.addEventListener('mouseenter', () => clearTimeout(remainTimer));
  toast.addEventListener('mouseleave', () => {
    remainTimer = setTimeout(dismiss, 1500); // 鼠标离开后1.5秒自动消失
  });

  // 优雅淡出并从页面移除的局部闭包函数
  function dismiss() {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100px) scale(0.8)';
    toast.style.maxHeight = '0px';
    toast.style.paddingTop = '0px';
    toast.style.paddingBottom = '0px';
    toast.style.marginTop = '-10px'; // 向上坍缩折叠，消除空隙
    
    // 等待离场动画结束后彻底拔除 DOM 节点
    setTimeout(() => toast.remove(), 350);
  }
}
