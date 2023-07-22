import { getNoteDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName } from './js/utils.js'
import { batchDownload, batchDownloadJSONFile, downloadJSONFile } from './js/batch.js'

const menus = [
  {
    'id': 'downloadNoteImage',
    'type': 'normal',
    'title': 'download Note Image'
  },
  {
    'id': 'openNoteList',
    'type': 'normal',
    'title': 'open Note List'
  },
  {
    'id': 'downloadOne',
    'type': 'normal',
    'title': 'download One'
  }
]

menus.forEach(menu => {
  chrome.runtime.onInstalled.addListener(function () {
    chrome.contextMenus.create(menu)
  })
})

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  console.log(info, tab)
  const { menuItemId } = info
  if (menuItemId === 'downloadNoteImage') {
    const [{ documentId, frameId, result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getNoteDetail, args: [] })
    console.log({ documentId, frameId, result })
    await setupOffscreenDocument()
  
    const response = await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen', result })
    console.log('收到来自 offscreen 的回复：', response)
  }

  if (menuItemId === 'openNoteList') {
    openNoteList(tab)
  } else if (menuItemId === 'downloadOne') {
    await setupOffscreenDocument()
    batchDownload(tab)
  }
})


chrome.runtime.onMessage.addListener(async function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, url, result, filename } = request

  // download json file
  if (cmd === 'offscreen_to_background') {
    const { title, name } = result || {}
    if (!title || !name) {
      console.log('fail')
    }
    const filePath = `${name}/${title}`
    const filename = `${filePath}.json`
    chrome.downloads.download({ url: url, filename }).then(downloadId => {
      return { downloadId }
    })
    downloadImage(result)
  }

  // TODO
  if (cmd === 'offscreen_to_background__batch') {
    const { filename }  = request
    filename
    ? downloadJSONFile({ ...request, note: result })
    : batchDownloadJSONFile({ ...request, note: result })
  }
  if (cmd === 'content_script_to_background') {
    console.log('content-script: ', result)
    const { url, note } = result
    if (url && note) {
      await chrome.storage.local.set({ [url]: note })
      console.log('success')
    }
  }
  if (cmd === 'content_script_to_background__list') {
    console.log('content-script: ', result)
    const { url, note } = result
    const obj = await chrome.storage.local.get(url)
    if (obj && Array.isArray(obj[url])) {
      console.log({ ...obj })
      // 追加处理
      // TODO 用数据库
      const storageData = obj[url]
      const res = append(storageData, note || [])
      await chrome.storage.local.set({ [url]: res })
      return
    }
    if (url && note) {
      await chrome.storage.local.set({ [url]: note })
      console.log('success')
    }
  }

  sendResponse({ message: '我是后台，已收到你的消息：', request })
})

function append(oldValue = [], newValue = []) {
  const result = [...oldValue]
  const m = {}
  oldValue.forEach(item => {
    m[item.id] = item
  })
  for (let index = 0, len = newValue.length; index < len; index++) {
    const item = newValue[index]
    if (!m[item.id]) {
      result.push(item)
    }
  }

  return result
}

async function downloadImage(result) {
  const { url, title, name: namePath, images } = result
  const list = await fetch(url)
  .then(res => res.text())
  .then(html => {
    const traceIds = html.match(/"traceId":".*?"/g);
    // ["\"traceId\":\"1000g0082kttq8lkim0504b4gmspsdu4arfiv1f8\""]
    return traceIds.map(id => `https://sns-img-qc.xhscdn.com/${id.split(':')[1].replaceAll('"', '')}`).map(src => {
      const { name, ext } = pathParse(src)
      return {
        url: src,
        filename: ext ? `${namePath}/${title}/${filename}` : `${namePath}/${title}/${name}.jpg`
      }
    })
  })
  const tasks = list.map(({ url, filename }) => {
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { downloadId }
    })
  })
  return Promise.allSettled(tasks)
}

async function openNoteList(tab) {
  const res = await chrome.storage.local.get(tab.url)
  console.log(res)

  // 循环打开tab，间隔2s个
  function create(url) {
    return chrome.tabs.create({ url: url })
  }
  const list = res[tab.url]
  if (!Array.isArray(list)) {
    console.log('fail: ', list, tab.url)
    return
  }
  // 过滤已存储的数据
  const filterList = []
  for (let index = 0; index < list.length; index++) {
    const item = list[index];
    const { id, noteCard } = item
    const url = `https://www.xiaohongshu.com/explore/${id}`
    const note = await chrome.storage.local.get(url)
    if (!note || !note[url]) {
      filterList.push(item)
    }
  }

  console.log('filterList', filterList)
  const total = filterList.length
  while(filterList.length) {
    const items = filterList.splice(0, 5)
    const tasks = items.map(item => {
      const { id, noteCard } = item
      const { user } = noteCard
      const url = `https://www.xiaohongshu.com/user/profile/${user.userId}/${id}` // == `https://www.xiaohongshu.com/explore/${id}`
      return chrome.tabs.create({ url: url })
    })

    const tabs = await Promise.all(tasks)
    console.log(`${total - filterList.length}/${total}`, { tabs })
    await sleep(3000 * items.length)

    try {
      const removeTabs = tabs.map(({ id }) => chrome.tabs.remove(id))
      await Promise.allSettled(removeTabs)
    } catch (error) {
      console.log(error)
    }
    await sleep(1500)
  }
}

function downloadImage2(result) {
  const { title, name: namePath, images } = result
  const list = images.map(item => {
    const { filename } = item
    const { name, ext } = pathParse(filename)
    return {
      ...item,
      filename: ext ? `${namePath}/${title}/${filename}` : `${namePath}/${title}/${name}.jpg`
    }
  })
  const tasks = list.map(({ url, filename }) => {
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { downloadId }
    })
  })
  return Promise.allSettled(tasks)
}
