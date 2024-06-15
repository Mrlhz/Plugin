import { getTopicDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName } from './js/utils.js'
import { getAllWindow, getCurrentTab } from './js/helper.js'

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
    'title': 'topic single'
  },
  {
    'id': TOPIC_LIST_SINGLE,
    'type': 'normal',
    'title': 'topic List single'
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

  const tabs = await getAllWindow()
  const filterTabs = tabs.filter(tab => tab.url.includes('viewthread.php?tid='))

  const list = await getTopicList(filterTabs)
  console.log({ list })
  if (menuItemId === TOPIC_LIST) {
    await setupOffscreenDocument()

    const response = await chrome.runtime.sendMessage({ cmd: BACKGROUND_TO_OFFSCREEN, result: list })
    console.log('收到来自 offscreen 的回复：', response)

  }

  if (menuItemId === TOPIC_SINGLE) {
    await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }
  
  if (menuItemId === TOPIC_LIST_SINGLE) {
    await setupOffscreenDocument()

    const response = await chrome.runtime.sendMessage({ cmd: BACKGROUND_TO_OFFSCREEN__SINGLE, result: list })
    console.log('收到来自 offscreen 的回复：', response)

  }

})


chrome.commands.onCommand.addListener(async (command) => {
  console.log(`Command "${command}" triggered`)
  if (command === 'run-TOPIC_SINGLE') {
    await getOneTopic(BACKGROUND_TO_OFFSCREEN__SINGLE)
  }
})

async function getOneTopic(cmd) {
  const tab = await getCurrentTab()
  const list = await getTopicList([tab])
  console.log({ list })
  await setupOffscreenDocument()

  const response = await chrome.runtime.sendMessage({ cmd, result: list })
}

async function getTopicList(tabs = []) {
  
  const tasks = tabs.map(tab => {
    return chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getTopicDetail, args: [] }).then(([{ documentId, frameId, result }]) => result)
  })

  const result =  await Promise.all(tasks)
  return result
}


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, result } = request

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
    ]);
    await downloadSingleImage(result, outputPath);
  }

  sendResponse({ message: '我是后台，已收到你的消息：', request })
})

async function downloadFile(files = []) {
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

    list.forEach((item) => {
      const { author, title, topic, blob, images } = item
      const output = dirKey && dir ? `${dir}/${item[dirKey] || author}` : dir
      const filename = `${output}/${title}${ext}`
      result.push({ url: item[blobKey], filename })
    })

  }
  const filesList = await pathExists(result)

  const tasks = filesList.map(file => {
    return chrome.downloads.download(file).then(downloadId => {
      return { downloadId }
    })
  })
  const res = await Promise.all(tasks)
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
      const filename = `${dir}/${author}/images/${base}`
      return { url: image, filename }
    })

    const imagesList = await pathExists(body)

    const tasks = imagesList.map(file => {
      return chrome.downloads.download(file).then(downloadId => {
        return { downloadId }
      })
    })
    
    await Promise.all(tasks)
    await sleep(5000)

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
  const dir = 'D:\\Downloads'
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
