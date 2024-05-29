import { getTopicDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName } from './js/utils.js'
import { getAllWindow } from './js/helper.js'

const TOPIC = 'TOPIC'
const TOPIC_LIST = 'TOPIC_LIST'
const BACKGROUND_TO_OFFSCREEN = 'BACKGROUND_TO_OFFSCREEN'
const OFFSCREEN_TO_BACKGROUND = 'OFFSCREEN_TO_BACKGROUND'

const outputPath = 'md' // markdown
const outputImagesPath = `${outputPath}/images`

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
    const list = await getTopicList([tab])
    console.log({ list })
    await setupOffscreenDocument()

    const response = await chrome.runtime.sendMessage({ cmd: BACKGROUND_TO_OFFSCREEN, result: list })
  }

  if (menuItemId === TOPIC_LIST) {
    const tabs = await getAllWindow()
    const filterTabs = tabs.filter(tab => tab.url.includes('viewthread.php?tid='))

    const list = await getTopicList(filterTabs)
    console.log({ list })
    await setupOffscreenDocument()

    const response = await chrome.runtime.sendMessage({ cmd: BACKGROUND_TO_OFFSCREEN, result: list })
    console.log('收到来自 offscreen 的回复：', response)

  }

})

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
    const tasks = result.map((item) => {
      const { title, topic, blob, images } = item
      const filename = `${outputPath}/${title}.md`
      return chrome.downloads.download({ url: blob, filename }).then(downloadId => {
        return { downloadId }
      })
    })
    await Promise.allSettled(tasks)
    await downloadImage(result)
    // TODO
    const htmlTasks = result.map((item) => {
      const { title, htmlBlob } = item
      const filename = `${outputPath}/${title}.html`
      return chrome.downloads.download({ url: htmlBlob, filename }).then(downloadId => {
        return { downloadId }
      })
    })
    await Promise.allSettled(htmlTasks)
  }

  sendResponse({ message: '我是后台，已收到你的消息：', request })
})

async function downloadImage(list = []) {
  const imagesList = []
  for (let index = 0; index < list.length; index++) {
    const element = list[index];
    imagesList.push(...element.images)
  }

  const filters = ['back.gif']
  const tasks = imagesList.filter(image => {
    return !filters.includes(pathParse(image).base)
  })
  .map(image => {
    const { base } = pathParse(image)
    const filename = `${outputImagesPath}/${base}`
    return chrome.downloads.download({ url: image, filename }).then(downloadId => {
      return { downloadId }
    })
  })
  
  await Promise.all(tasks)
}
