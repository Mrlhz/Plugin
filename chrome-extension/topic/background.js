import { getTopicDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName, slug, parseQuery } from './js/utils.js'
import { getAllWindow, getCurrentTab } from './js/helper.js'
import { pathExists, notice } from './js/pathExists.js'
import { setClass } from './js/searchpost.js';
import { outputSearchpost } from './js/space.js';
import { getVideoSource, downloadVideo, downloadVideos } from './js/video.js';
import { AsyncQueue } from './downloads/AsyncQueue.js';
import { createDownloadTask } from './downloads/createDownloadTask.js';

import { GrabberCoreEngine, metrics } from './core/index.js';
import { BlogStrategy } from './core/namer.js';


// 用于辅助判断一键取消状态的变量
let lastTotalCount = 0;
let lastIsCancelled = false;
const globalConcurrency = 5; // 默认并发数
// const globalSettingsKey = 'global_grabber_configs'; // 存储设置的键名
const globalSettingsKey = '__settings__'; // 存储设置的键名
const defaultSettings = { concurrency: globalConcurrency };

const TOPIC_KEY = 'topic'
const TOPIC = 'TOPIC'
const TOPIC_LIST = 'TOPIC_LIST'
const BACKGROUND_TO_OFFSCREEN = 'BACKGROUND_TO_OFFSCREEN'
const OFFSCREEN_TO_BACKGROUND = 'OFFSCREEN_TO_BACKGROUND'

// 根据作者名称建立文件夹
const TOPIC_SINGLE = 'TOPIC_SINGLE'
const TOPIC_LIST_SINGLE = 'TOPIC_LIST_SINGLE'
const BACKGROUND_TO_OFFSCREEN__SINGLE = 'BACKGROUND_TO_OFFSCREEN__SINGLE'
const OFFSCREEN_TO_BACKGROUND__SINGLE = 'OFFSCREEN_TO_BACKGROUND__SINGLE'

const download_ALL_VIDEO = 'ALT_1'

const AUTHOR_ID = 'AUTHOR_ID'

const outputPath = 'md' // markdown
const outputImagesPath = `${outputPath}/images`

const globalSet = new Set()

const menus = [
  {
    'id': TOPIC,
    'type': 'normal',
    'title': 'topic'
  },
  {
    'id': TOPIC_LIST,
    'type': 'normal',
    'title': 'topic List'
  },
  {
    'id': TOPIC_SINGLE,
    'type': 'normal',
    'title': 'topic single[Alt + S]'
  },
  {
    'id': TOPIC_LIST_SINGLE,
    'type': 'normal',
    'title': 'topic List single[Alt + L]'
  }
];

// 1. 初始化时，先读取存储中的配置项，确保动态对齐
const initEngine = () => {
  return new Promise((resolve) => {
    chrome.storage.local.get([globalSettingsKey], (res) => {
      const userConfigs = res[globalSettingsKey] || {};

      // 🌟 读取并发数配置（这里使用了之前改写好的对象传参式防呆构造函数）
      const downloadQueue = new AsyncQueue({ 
        concurrency: Number(userConfigs.concurrency) || 5
      });

      // 🌟 传入配置好的 Node 路径及其他决策开关
      const coreEngine = new GrabberCoreEngine(downloadQueue, userConfigs.serverUrl);
      
      // 保持单例挂载
      globalThis.__DOWNLOAD_QUEUE__ = downloadQueue;
      globalThis.__CORE_ENGINE__ = coreEngine;

      resolve({ downloadQueue, coreEngine });
    });
  });
}

initEngine().then(({ downloadQueue, coreEngine }) => {
  console.log('[CoreEngine] 初始化完成，后台守护神已就绪。');
  // globalThis.__DOWNLOAD_QUEUE__ = downloadQueue;
  // globalThis.__CORE_ENGINE__ = coreEngine;
  globalThis.__CORE_ENGINE__.queue.on('statusChange', (status) => {
    // console.log(`[💾 队列状态变动] 正在下载: ${status.activeCount} | 排队中: ${status.waitingCount} | 总数: ${status.totalCount} | 暂停: ${status.isPaused}`);
    const { totalCount, isPaused } = status;

    // 当一键取消导致数量清空时的特殊动画反馈
    if (totalCount === 0 && lastTotalCount > 0 && lastIsCancelled) {
      chrome.action.setBadgeText({ text: '🛑' });
      chrome.action.setBadgeBackgroundColor({ color: '#EA4335' });
      setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2000);
      lastIsCancelled = false;
      lastTotalCount = 0;
      return;
    }

    lastTotalCount = totalCount;

    // 根据当前状态更新徽章显示
    updateBadge(status);
  });
});

// 监听插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
  console.log('🛑 插件图标被点击！正在取消所有下载任务...');
  lastIsCancelled = true; // 标记这是用户主动点击取消的
  
  // 核心：直接调用。内部的 onStatusChange 会完美接管“🛑”的闪烁动画
  globalThis.__DOWNLOAD_QUEUE__.cancelAll();
});

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.removeAll(function() {
    menus.forEach(menu => {
      chrome.contextMenus.create(menu)
    })
  })
})

chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {

});

chrome.downloads.onChanged.addListener(async (downloadDelta) => {
  if (!downloadDelta.state || downloadDelta.state.current !== 'complete') {
    globalSet.add(downloadDelta.id)
  }
  if (downloadDelta?.state?.current === 'complete' || downloadDelta?.error) {
    globalSet.delete(downloadDelta.id)
  }
});

// 【实时监听】在控制台 await chrome.storage.local.set 修改时，立即动态生效
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[globalSettingsKey]) {
    const newSettings = changes[globalSettingsKey].newValue || {};
    if (newSettings.concurrency) {
      globalThis.__DOWNLOAD_QUEUE__.setConcurrency(newSettings.concurrency);
      console.log(`⚡ 实时检测到设置变更，并发数调整为: ${newSettings.concurrency}`);
    }
  }
});

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  console.log(info, tab)
  const { menuItemId } = info
  if (menuItemId === TOPIC) {
    await getOneTopic(BACKGROUND_TO_OFFSCREEN)
  }

  if (menuItemId === TOPIC_SINGLE) {
    await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }
  
  if (menuItemId === TOPIC_LIST) {
    await getTopicList(BACKGROUND_TO_OFFSCREEN)
  }
  if (menuItemId === TOPIC_LIST_SINGLE) {
    await getTopicList(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }

})


chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Command "${command}" triggered`);

  if (command === 'RUN_TOPIC_SINGLE') {
    const tab = await getCurrentTab()
    const { pathname } = new URL(tab.url)
    if (pathname === '/space.php') {
      await outputSearchpost(tab)
    } else if (pathname === '/view_video.php') {
      const [{ result }] = await getVideoSource(tab);
      console.log('视频信息：', result);
      await downloadVideo(result);
    } else {
      await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE)
    }
  }
  if (command === 'RUN_TOPIC_LIST_SINGLE') {
    await getTopicList(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }
  if (command === 'RUN_TOPIC_ALLPAGE') {
    const options = { allPage: true }
    await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE, options)
  }
  if (command === download_ALL_VIDEO) {
    await downloadVideos()
  }
})

async function getOneTopic(cmd, options) {
  try {
    const tab = await getCurrentTab();
    const list = await getTopicDetails([tab], options)
    console.log({ list })
    await setupOffscreenDocument()

    const response = await chrome.runtime.sendMessage({ cmd, result: list, options })
  } catch (error) {
    console.warn('Error occurred while fetching topic:', error)
  }
}

async function getTopicList(cmd) {
  const tabs = await getAllWindow()
  const filterTabs = tabs.filter(tab => tab.url.includes('viewthread.php?tid='))

  const list = await getTopicDetails(filterTabs)
  console.log({ list })
  await setupOffscreenDocument()

  const response = await chrome.runtime.sendMessage({ cmd, result: list })
  console.log('收到来自 offscreen 的回复：', response)
}

async function getTopicDetails(tabs = [], options = {}) {
  // const { allPage } = options || {}
  const tasks = tabs.map(tab => {
    const { search } = new URL(tab.url)
    const { tid, page } = parseQuery(search)
    return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getTopicDetail, args: [{ tid, page, ...(options || {}) }] })
      .then(([{ documentId, frameId, result }]) => result)
  })

  const taskResult = await Promise.all(tasks)
  const result = taskResult.filter(item => item[TOPIC_KEY])

  await setAuthor(result);

  return result
}
async function setAuthor(data = []) {
  for (const item of data) {
    let author = item.author;
    const { authorLink, page, tid } = item;

    if (!page || page == '1') {
      const { uid } = parseQuery(new URL(authorLink).search);
      item.authorId = uid;

      let authorIds = (await chrome.storage.local.get(AUTHOR_ID))[AUTHOR_ID] || {};
      if (!authorIds[uid]) {
        authorIds[uid] = author;
        await chrome.storage.local.set({ [AUTHOR_ID]: authorIds })
      }
    }

    // else
    if (page >= 2) {
      const info = (await chrome.storage.local.get(tid))[tid];
      item.authorId = info?.authorId
      item.author = info?.author
    }
  }
}


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result, options } = request

  // download file
  if (cmd === OFFSCREEN_TO_BACKGROUND) {
    handleUnifiedDownloadTask(result, options)
  }

  if (cmd === OFFSCREEN_TO_BACKGROUND__SINGLE) {
    handleUnifiedDownloadTask(result, options)
  }

  sendResponse({ message: '我是后台，已收到你的消息：', request });
  return true; // 🌟 关键：保持消息通道开启，支持异步 sendResponse
})

/**
 * 🚀 统一的单任务下载处理器
 */
async function handleUnifiedDownloadTask(result = [], options = {}) {
  if (!Array.isArray(result) || result.length === 0) return { skipped: 0, pushed: 0 };

  const strategy = new BlogStrategy();
  const allEngineItems = [];

  for (const element of result) {
    // 注入需要的额外字段（如 htmlBlob），让 Processor 能够在解析时获取到完整的资源信息
    const rawData = {
      article: {
        id: element.tid,
        title: element.title,
        author: element.author,
        authorId: element.authorId,
        images: element.images || [],
        // 传递 需要的 HTML 资源凭证
        htmlUrl: element.htmlBlob,
        page: element.page || 1,
        allPage: options?.allPage || false
      }
    };

    // 统一通过策略类解析出包含 HTML 和 Images 的标准任务结构
    const items = strategy.parse(rawData, { customDir: outputPath });
    if (items) {
      allEngineItems.push(items);
    }
  }

  if (allEngineItems.length === 0) {
    return { skipped: 0, pushed: 0 };
  }

  // 统一交付给核心引擎批量执行，内部自带去重、限流等高内聚逻辑
  console.log('准备推送到核心引擎的统一任务清单：', allEngineItems);
  const engineResult = await globalThis.__CORE_ENGINE__.executeBatchDownload(allEngineItems, options);
  console.log(`[Background] 统一批量下载结果：已跳过 ${engineResult.skipped} 个，成功推送 ${engineResult.pushed} 个任务。`);
  if (engineResult?.pushed > 0) {
    await setStorage(allEngineItems.map(item => {
      return {
        id: item.id,
        title: item.title,
        authorId: item.authorId || 'unknown',
        author: item.authorName || '未知博主'
      }
    }));
  }
  return engineResult;
}

async function setStorage(list = []) {
  for (const item of list) {
    // const { tid, title, authorId, author } = item
    const { id, title, authorId, authorName } = item
    await chrome.storage.local.set({ [id]: { title, authorId, author: authorName } })
  }
}

/**
 * 状态更新与徽章渲染函数
 */
function updateBadge(status) {
  const { totalCount, isPaused } = status;

  if (totalCount > 0) {
    chrome.action.setBadgeText({ text: String(totalCount) });
    // 如果处于暂停状态，显示灰色；正在运行则显示蓝色
    const color = isPaused ? '#9AA0A6' : '#4285F4';
    chrome.action.setBadgeBackgroundColor({ color });
  } else {
    chrome.action.setBadgeText({ text: '' });
  }

}
