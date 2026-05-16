import { getTopicDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName, slug, parseQuery } from './js/utils.js'
import { getAllWindow, getCurrentTab } from './js/helper.js'
import { pathExists, notice } from './js/pathExists.js'
import { setClass } from './js/searchpost.js';
import { outputSearchpost } from './js/space.js';
import { getVideoSource, downloadVideo, downloadVideos } from './js/video.js';
import { ChromeDownloadPool } from './js/ChromeDownloadPool.js';

// 1. 初始化下载池：限制最大同时下载数为 2
const downloadPool = new ChromeDownloadPool(2);

// 2. 维护一个全局可变的取消控制器
let globalCancelController = new AbortController();

// 核心控制变量
let progressTickerId = null;

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
const filters = ['back.gif']

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
]

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.removeAll(function() {
    menus.forEach(menu => {
      chrome.contextMenus.create(menu)
    })
  })
})

chrome.tabs.onUpdated.addListener(async function(tabId, changeInfo, tab) {
  console.log({ tabId, changeInfo, tab });
  const storage = await chrome.storage.local.get(null)
  const isTarget = changeInfo.url?.startsWith('http');
  if (isTarget && changeInfo.status === 'complete') {
    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: setClass, args: [{ storage }] });
    } catch (error) {
      console.log(error)
    }
  }
});

chrome.downloads.onChanged.addListener(async (downloadDelta) => {
  if (!downloadDelta.state || downloadDelta.state.current !== 'complete') {
    globalSet.add(downloadDelta.id)
  }
  if (downloadDelta?.state?.current === 'complete' || downloadDelta?.error) {
    globalSet.delete(downloadDelta.id)
  }
})

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
  console.log(`Command "${command}" triggered`)
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
  const tab = await getCurrentTab()
  const list = await getTopicDetails([tab], options)
  console.log({ list })
  await setupOffscreenDocument()

  const response = await chrome.runtime.sendMessage({ cmd, result: list, options })
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


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result, options } = request

  // download file
  if (cmd === OFFSCREEN_TO_BACKGROUND) {
    await downloadFile([
      {
        list: result,
        dir: outputPath,
        ext: '.md',
        blobKey: 'blob'
      },
      {
        list: result,
        dir: outputPath,
        ext: '.html',
        blobKey: 'htmlBlob'
      }
    ]);
    await downloadImage(result, outputImagesPath)
  }

  if (cmd === OFFSCREEN_TO_BACKGROUND__SINGLE) {
    await downloadFile([
      // {
      //   list: result,
      //   dir: outputPath,
      //   dirKey: 'author',
      //   ext: '.md',
      //   blobKey: 'blob'
      // },
      {
        list: result,
        dir: outputPath,
        dirKey: 'author',
        ext: '.html',
        blobKey: 'htmlBlob'
      }
    ], options);
    await downloadSingleImage(result, outputPath);
  }

  sendResponse({ message: '我是后台，已收到你的消息：', request })
})

async function downloadFile(files = [], options = {}) {
  if (!Array.isArray(files)) {
    return []
  }
  const result = []
  for (let index = 0; index < files.length; index++) {
    const file = files[index];
    const { list = [], dir, dirKey, ext = '.md', blobKey } = file
    console.log({ list, dir, ext, blobKey })
    if (!Array.isArray(list)) {
      continue
    }

    const { allPage } = options || {}
    list.forEach((item) => {
      const { author, title, topic, blob, images, tid, page, authorId } = item
      const output = dirKey && dir ? `${dir}/${safeFileName(item[dirKey] || author)}` : dir
      let _title = `${title}__${tid}`;
      _title = allPage ? `${_title}_page${page || 1}` : _title;
      const filename = `${slug(output)}/${safeFileName(_title)}${ext}`;
      result.push({ url: item[blobKey], filename, title, tid, authorId, author })
    })

  }
  const filesList = await pathExists(result)
  const exists = filterAlreadyExists(result, filesList)
  await setStorage(exists)

  const tasks = filesList.map(({ url, filename }) => {
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { downloadId }
    }).catch(error => {
      console.log({ url, filename, error })
      notice({ message: `${error?.message}: ${filename}` })
    })
  })
  const res = await Promise.all(tasks)
  await setStorage(filesList)
  return res
}

async function downloadSingleImage(list = [], dir) {
  
  // const pool = new ChromeDownloadPool(3); // 限制同时只有 3 个文件在真正写入磁盘

  for (let index = 0; index < list.length; index++) {
    const element = list[index];
    const { author, title, topic, blob, images } = element
    const body = images.filter(image => {
      return !filters.includes(pathParse(image).base)
    })
    .map(image => {
      const { base } = pathParse(image)
      const filename = `${dir}/${safeFileName(author)}/images/${base}`
      return { url: image, filename }
    })

    const imagesList = await pathExists(body)
    // const tasks = imagesList.map(file => {
    //   return chrome.downloads.download(file).then(downloadId => {
    //     return { downloadId }
    //   }).catch(error => {
    //     console.log({ ...file, error })
    //     notice({ message: `${error?.message}: ${file.filename}` })
    //   })
    // })
    
    // await Promise.all(tasks)
    const downloadList = [...imagesList];
    downloadList.forEach(file => {
      // pool.download(file)
      //   .then(res => console.log(`文件 ${res.id} 下载完整 √`))
      //   .catch(err => console.error(`文件下载失败:`, err));
      
      // 统一绑定当前的全局取消信号
      downloadPool.download(
        file,
        { priority: 1, signal: globalCancelController.signal }
      )
      .then((res) => console.log(`✅ 下载完成: ID ${res.id}`))
      .catch((err) => console.log(`❌ 任务结束: ${err.message}`))
      .finally(() => {
        // 任务完成（成功/失败/取消）后，立刻主动核对一次轮询状态
        updateProgressTicker();
      });

      // 只要有新任务被推入，确保轮询处于激活状态
      startProgressTicker();
    });


    // while (downloadList.length) {
    //   if (globalSet.size >= 3) {
    //     await sleep(1500);
    //     continue
    //   }
    //   const image = downloadList.shift()
    //   await chrome.downloads.download(image).then(downloadId => {
    //     return { downloadId }
    //   }).catch(error => {
    //     console.log({ ...image, error })
    //     notice({ message: `${error?.message}: ${image.filename}` })
    //   })
    // }

    // for (const image of imagesList) {
    //   await chrome.downloads.download(image).then(downloadId => {
    //     return { downloadId }
    //   }).catch(error => {
    //     console.log({ ...image, error })
    //     notice({ message: `${error?.message}: ${image.filename}` })
    //   })
    // }

    // if (imagesList.length) {
    //   await sleep(5000)
    // }

  }
}

async function downloadImage(list = [], dir) {
  const imagesList = []
  for (let index = 0; index < list.length; index++) {
    const element = list[index];
    imagesList.push(...element.images)
  }

  const tasks = imagesList.filter(image => {
    return !filters.includes(pathParse(image).base)
  })
  .map(image => {
    const { base } = pathParse(image)
    const filename = `${dir}/${base}`
    return chrome.downloads.download({ url: image, filename }).then(downloadId => {
      return { downloadId }
    })
  })
  
  await Promise.all(tasks)
}

function filterAlreadyExists(allList = [], filters = []) {
  const res = []
  const m = filters.reduce((acc, cur) => {
    acc[cur.tid] = cur.title
    return acc
  }, {});
  for (const item of allList) {
    const { tid } = item
    if (!m[tid]) {
      res.push(item)
    }
  }

  return res
}

async function setStorage(list = []) {
  for (const item of list) {
    const { tid, title, authorId, author } = item
    await chrome.storage.local.set({ [tid]: { title, authorId, author } })
  }
}

// 3. 监听插件图标点击事件
chrome.action.onClicked.addListener((tab) => {
  console.log('🛑 插件图标被点击！正在取消所有下载任务...');

  // 触发取消：此时不论是排队中的、还是正在下载的任务，都会收到 abort 信号
  globalCancelController.abort();

  // 完美闭环：必须重新实例化控制器，确保下一次调用 startBulkDownloads() 时能正常提交任务
  globalCancelController = new AbortController();
  
  console.log('🔄 取消信号已重置，下载池已恢复就绪状态。');

  // 完美闭环：强行掐断轮询
  stopProgressTicker();
  
  // 红色高亮闪烁提示“STOP”
  chrome.action.setBadgeText({ text: 'STOP' });
  chrome.action.setBadgeBackgroundColor({ color: '#F44336' });

  // 2.5秒后清空文字
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 2500);
});

/**
 * 实时计算并刷新多任务合并后的总体进度百分比
 */
function updateProgressTicker() {
  // 如果当前没有任何正在运行的任务，安全关闭轮询，清空徽章
  if (downloadPool.running === 0) {
    stopProgressTicker();
    chrome.action.setBadgeText({ text: '' });
    return;
  }

  // 1. 将当前的下载 ID 数组转换为 Set，以便进行 O(1) 复杂度的快速匹配
  const activeIdsSet = new Set(downloadPool.pendingResolvers.keys());
  
  if (activeIdsSet.size === 0) return;

  // 2. 传入空对象 {} 获取浏览器当前所有的下载项，在本地过滤出由我们池子管理的任务
  chrome.downloads.search({}, (items) => {
    // 检查运行时是否有其他错误
    if (chrome.runtime.lastError) {
      console.log(chrome.runtime.lastError.message);
      return;
    }

    let totalBytes = 0;
    let bytesReceived = 0;
    let hasValidSize = false;

    items.forEach((item) => {
      // 通过本地 Set 检查，只统计属于当前并发池内的任务
      if (activeIdsSet.has(item.id)) {
        // 过滤出正在下载中且具有有效文件大小的任务
        if (item.state === 'in_progress' && item.totalBytes > 0) {
          totalBytes += item.totalBytes;
          bytesReceived += item.bytesReceived;
          hasValidSize = true;
        }
      }
    });

    // 3. 计算合并进度百分比
    if (hasValidSize && totalBytes > 0) {
      const percentage = Math.floor((bytesReceived / totalBytes) * 100);
      
      // 完美适配 4 字节极限展示
      chrome.action.setBadgeText({ text: `${percentage}%` });
      chrome.action.setBadgeBackgroundColor({ color: '#4CAF50' }); // 进度中显示绿色
    } else {
      // 处理无法获取文件总大小（如流式 chunked 下载）的边缘情况
      chrome.action.setBadgeText({ text: '...' });
      chrome.action.setBadgeBackgroundColor({ color: '#2196F3' });
    }
  });
}

/**
 * 启动轮询：一旦并发池开始消耗任务，立即开启高频监听
 */
function startProgressTicker() {
  if (progressTickerId) return; // 避免重复创建定时器
  // 每 500ms 高效轮询一次底层下载字节数据
  progressTickerId = setInterval(updateProgressTicker, 500);
}

/**
 * 关闭轮询：释放系统 CPU 消耗，符合 Service Worker 省电机制
 */
function stopProgressTicker() {
  if (progressTickerId) {
    clearInterval(progressTickerId);
    progressTickerId = null;
  }
}
