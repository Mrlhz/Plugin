// import Dexie from './dexie.min.js';
// import Dexie from 'https://unpkg.com/dexie/dist/modern/dexie.mjs';
import Dexie from './dexie.mjs';
import { AsyncQueue, createDownloadTask } from './AsyncQueue/index.js';
import { downloadsLocation, exts } from './globalConfig.js';

// ==========================================
// 🛡️ 状态追踪表与 Server.js 联动引擎
// ==========================================
const downloadRegistry = new Map(); // 存储格式：Map<filename, 'downloading'>
const SERVER_URL = 'http://localhost:8080/pathExists';

// 1. 全局初始化工业级下载队列（设置并发为 5）
const downloadQueue = new AsyncQueue(5, {
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
    downloadMediaBatch(message.items).then((result) => {
      sendResponse({ 
        success: true, 
        total: message.items.length, 
        skipped: result.skipped, 
        pushed: result.pushed 
      });
    });
    return true; // 保持异步通信通道开启
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
 * 📥 批量下载入口：完美融入 AsyncQueue、本地磁盘深度扫描
 */
async function downloadMediaBatch(items) {
  let rawTasks = []; // 临时存放本次操作拆解出的全量任务
  let skippedByRegistryAndChrome = 0;

  // ==========================================
  // 步骤一：解析出所有文件的相对路径，并执行前两层轻量校验
  // ==========================================
  for (const item of items) {
    let safeNickname = cleanString(item.author?.nickname) || '未知作者';
    let safeDesc = cleanString(item.desc) || item.aweme_id;
    const basePath = `Douyin_Grab/${safeNickname}/`;

    if (item.type === 'video') {
      const videoUrl = item.downloadUrl || item.playUrl;
      if (!videoUrl) continue;

      // const filename = `${basePath}${safeDesc}_${item.aweme_id}.mp4`;
      const filename = getFileName(item);

      // 【第一层防线】：内存正在下载去重
      if (downloadRegistry.get(filename) === 'downloading') {
        skippedByRegistryAndChrome++;
        continue;
      }
      // 【第二层防线】：Chrome 运行时历史记录去重
      const isChromeExist = await new Promise(r => chrome.downloads.search({ filename, state: 'complete', exists: true }, res => r(res?.length > 0)));
      if (isChromeExist) {
        skippedByRegistryAndChrome++;
        continue;
      }

      // 通过前两层，视为待检测的候选任务
      rawTasks.push({ url: videoUrl, filename, conflictAction: 'overwrite', priority: 1 });

    } else if (item.type === 'note' && item.images?.length > 0) {
      const filenames = getFileName({ ...item });
      for (let index = 0; index < item.images.length; index++) {
        const img = item.images[index];
        if (!img.url) continue;

        // const filename = `${basePath}${safeDesc}_图文_${item.aweme_id}/image_${index + 1}.webp`;
        const filename = filenames[index];

        if (downloadRegistry.get(filename) === 'downloading') {
          skippedByRegistryAndChrome++;
          continue;
        }
        const isChromeExist = await new Promise(r => chrome.downloads.search({ filename, state: 'complete', exists: true }, res => r(res?.length > 0)));
        if (isChromeExist) {
          skippedByRegistryAndChrome++;
          continue;
        }

        rawTasks.push({ url: img.url, filename, conflictAction: 'uniquify', priority: 0 });
      }
    }
  }

  // ==========================================
  // 步骤二：👑 一键打包送往 Node.js 服务端进行批量硬核校验
  // ==========================================
  const totalRawCount = rawTasks.length;
  // 过滤出真正要在硬盘上建立下载的任务
  const finalTasksToDownload = await filterExistingFilesByServer(rawTasks);
  
  // 计算在硬盘层被过滤掉的数量
  const skippedByServer = totalRawCount - finalTasksToDownload.length;
  const totalSkipped = skippedByRegistryAndChrome + skippedByServer;

  // ==========================================
  // 步骤三：将经过三层严格筛选后的干净任务，灌入 AsyncQueue 消费
  // ==========================================
  finalTasksToDownload.forEach(task => {
    pushTaskWithRetry(
      { url: task.url, filename: task.filename, conflictAction: task.conflictAction },
      task.priority
    );
  });

  console.log(`[🎉 去重完成] 自动过滤了 ${totalSkipped} 个重复文件。`);

  // 返回给前端 content.js 用于气泡弹窗统计
  return { 
    skipped: totalSkipped, 
    pushed: finalTasksToDownload.length 
  };
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

  // 【第三层防线】：👑 联动调用Node.js 服务检测实体硬盘
  // 即使重装了浏览器或清理了下载历史，只要硬盘里的文件还在，就能防重！
  try {
    const safeNickname = cleanString(itemRaw.author?.nickname, '_', '_') || '未知作者';
    const safeDesc = cleanString(itemRaw.desc, '_', '_') || itemRaw.aweme_id;

    // 拼装出契合 server.js 的请求 Payload 格式
    const payload = [{
      filename: filename, // 传入相对路径
      downloadsLocation: [
        ...downloadsLocation
      ],
      exts: [...exts]
    }];

    // 异步发出 POST 请求
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const serverRes = await response.json();
      // server.js 逻辑：返回所有“不存在”的项。
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
 * 🛟 终极防护版：带状态锁与临门一脚校验的异步队列压入函数
 */
function pushTaskWithRetry(downloadOptions, currentPriority = 1, attempt = 1) {
  const { filename } = downloadOptions;

  // 【第一道关卡：入库前拦截】
  // 如果当前内存里已经在下载或排队这个文件了，直接物理蒸发，绝不重复入队
  if (downloadRegistry.get(filename) === 'downloading') {
    console.log(`[🚀 连击拦截] 任务正在排队或下载中，拒绝重复入队: ${filename}`);
    return;
  }

  // 登记锁定状态：表示该文件已被占位
  downloadRegistry.set(filename, 'downloading');

  // 包装契合 AsyncQueue 的任务函数
  const taskFn = (context) => {
    // 💡 核心改动：在 createDownloadTask 的外层嵌套一层“临门一脚”校验
    return new Promise(async (resolve, reject) => {
      
      // 【第二道关卡：出库触发前终审】
      // 任务在队列中排队完毕，准备发起网络请求的这一瞬间，再次检索本地硬盘
      // 防止在排队期间，上一个相同的下载任务刚刚好下载完成
      const isFileExistOnDisk = await new Promise((r) => {
        chrome.downloads.search({ filename, state: 'complete', exists: true }, (res) => {
          r(res && res.length > 0);
        });
      });

      if (isFileExistOnDisk) {
        console.log(`[🎯 临门拦截] 排队期间该文件已被前序任务下载完成，取消本次重复请求: ${filename}`);
        // 释放内存锁
        downloadRegistry.delete(filename);
        // 优雅宣告任务完成（让队列继续走下一个，不抛错触发重试）
        return resolve({ status: 'skipped_at_last_moment', filename });
      }

      // 通过终审，真正调用之前写的支持 AbortSignal 的标准 Chrome 下载任务
      const realDownloadRunner = createDownloadTask(downloadOptions);
      
      realDownloadRunner(context)
        .then(resolve)
        .catch(reject);
    });
  };

  // 将带终审的任务压入工业级 AsyncQueue 队列中
  downloadQueue.push(taskFn, { timeout: 60000, priority: currentPriority })
    .then((result) => {
      // 如果是被临门拦截跳过的，不需要打印落地日志
      if (result?.status === 'skipped_at_last_moment') return;

      console.log(`[Registry] 任务成功安全落地: ${filename}`);
      // 下载成功后解开内存锁，后续完全交给实体硬盘和 Chrome 历史去重
      downloadRegistry.delete(filename); 
    })
    .catch(err => {
      const errMsg = err.message || '';
      
      // 如果是被用户手动🛑强杀或取消的，直接解除锁定，允许未来重新触发
      if (errMsg.includes('cancelled') || errMsg.includes('AbortSignal')) {
        downloadRegistry.delete(filename);
        return;
      }

      // 异常断网容错重试机制
      if (attempt < 3) {
        // 5秒后重试时，由于重试前会再次进入 pushTaskWithRetry，
        // 我们在重试前先删掉锁，确保重试任务能够顺利重新入队
        downloadRegistry.delete(filename);
        setTimeout(() => {
          pushTaskWithRetry(downloadOptions, 0, attempt + 1);
        }, 5000);
      } else {
        // 彻底失败，解除锁定
        downloadRegistry.delete(filename);
        console.log(`[Registry] 任务重试耗尽，已释放锁: ${filename}`, errMsg);
      }
    });
}


/**
 * ⚡ 核心：将文件列表发给 server.js 进行一次性实体硬盘批量校验
 * @param {Array} taskList - 构建好的待下载任务数组
 * @returns {Promise<Array>} - 返回经过硬盘去重后，真正需要下载的任务数组
 */
async function filterExistingFilesByServer(taskList) {
  if (taskList.length === 0) return [];

  try {
    // 1. 组装契合 server.js 规范的批量 Payload 数组
    const payload = taskList.map(task => ({
      filename: task.filename,
      downloadsLocation: [
        ...downloadsLocation
      ],
      exts: [...exts] // 允许兼容检测的后缀
    }));

    // 2. 仅发起【一次】HTTP 请求，打包送检
    const response = await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      const serverRes = await response.json();
      // server.js 逻辑：result 返回的是所有“不存在（即需要下载）”的项
      // 我们通过 filename 将其映射回我们插件内部的 task 对象
      const missingFilenames = new Set((serverRes.result || []).map(r => r.filename));
      
      // 过滤出硬盘里没有的任务
      return taskList.filter(task => missingFilenames.has(task.filename));
    }
  } catch (err) {
    console.warn('[Server Link] 本地检测服务未启动，自动跳过硬盘批量校验，全量转入下载。');
  }

  // 如果服务端挂了，降级处理：全量返回不拦截
  return taskList;
}

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

  // 5. 截取前255个字符，防止超长报错
  return result.substring(0, 255);
}

function getFileName(aweme = {}) {
  const { type, author, desc, aweme_id } = aweme;
  const safeNickname = cleanString(author?.nickname) || '未知作者';
  const safeDesc = cleanString(desc) || aweme_id;
  const basePath = `${safeNickname}/`;
  if (type === 'video') {
    return `${basePath}${safeDesc}_${aweme_id}.mp4`;
  } else if (type === 'note') {
    const { images } = aweme;
    return (images || []).map((image, index) => {
      const extMatch = image.url.match(/\.(jpg|jpeg|png|gif|webp|bmp|tiff)(\?|$)/i);
      const extension = extMatch ? extMatch[1] : 'jpg';
      return `${basePath}${safeDesc}_${aweme_id}-${index + 1}.${extension}`;
    });
  }
}
