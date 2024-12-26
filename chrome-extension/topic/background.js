import { getTopicDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName, slug, parseQuery } from './js/utils.js'
import { getAllWindow, getCurrentTab } from './js/helper.js'

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

const outputPath = 'md' // markdown
const outputImagesPath = `${outputPath}/images`
const filters = ['back.gif']

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
    await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }
  if (command === 'RUN_TOPIC_LIST_SINGLE') {
    await getTopicList(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }
  if (command === 'RUN_TOPIC_ALLPAGE') {
    const options = { allPage: true }
    await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE, options)
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

  const result =  await Promise.all(tasks)
  return result.filter(item => item[TOPIC_KEY])
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
      {
        list: result,
        dir: outputPath,
        dirKey: 'author',
        ext: '.md',
        blobKey: 'blob'
      },
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
      const { author, title, topic, blob, images, tid, page } = item
      const output = dirKey && dir ? `${dir}/${item[dirKey] || author}` : dir
      const _title = allPage ? `${title}_page${page || 1}` : title
      const filename = `${slug(output)}/${safeFileName(_title)}${ext}`
      result.push({ url: item[blobKey], filename, title, tid })
    })

  }
  const filesList = await pathExists(result)
  const exists = filterAlreadyExists(result, filesList)
  await setStorage(exists)

  const tasks = filesList.map(({ url, filename }) => {
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { downloadId }
    })
  })
  const res = await Promise.all(tasks)
  await setStorage(filesList)
  return res
}

async function downloadSingleImage(list = [], dir) {
  for (let index = 0; index < list.length; index++) {
    const element = list[index];
    const { author, title, topic, blob, images } = element
    const body = images.filter(image => {
      return !filters.includes(pathParse(image).base)
    })
    .map(image => {
      const { base } = pathParse(image)
      const filename = `${dir}/${slug(author)}/images/${base}`
      return { url: image, filename }
    })

    const imagesList = await pathExists(body)

    const tasks = imagesList.map(file => {
      return chrome.downloads.download(file).then(downloadId => {
        return { downloadId }
      })
    })
    
    await Promise.all(tasks)
    if (imagesList.length) {
      await sleep(5000)
    }

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


async function pathExists(list = []) {
  const DOWNLOADSLOCATION = 'downloadsLocation'
  // Downloads Location
  // const dir = 'D:\\Downloads'
  const dir = 'D:\\Downloads\\mask\\91论坛\\markdown'
  list.forEach(item => {
    Reflect.set(item, DOWNLOADSLOCATION, dir);
  })

  const { result } = await fetch('http://localhost:8080/pathExists', {
    method: 'post',
    body: JSON.stringify(list),
    headers: {
      'Content-Type': 'application/json'
    }
  })
  .then(res => res.json())
  .catch(error => {
    console.log(error)
    let options = {
      type: 'basic',
      title: '通知',
      message: 'pathExists服务未启用',
      iconUrl: 'images/topic.jpg'
    };
    chrome.notifications.create(options);
    return { result: [] }
  })

  if (!Array.isArray(result)) {
    return []
  }

  // chrome.downloads.download 接收自定义字段会报错
  result.forEach(item => {
    Reflect.deleteProperty(item, DOWNLOADSLOCATION)
  })

  return result
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
    const { tid, title } = item
    await chrome.storage.local.set({ [tid]: title })
  }
}
