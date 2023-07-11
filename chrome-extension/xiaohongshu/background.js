import { getNoteDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse, sleep, safeFileName } from './js/utils.js'
import { batchDownload, batchDownloadJSONFile } from './js/batch.js'

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
  const { cmd, url, result } = request

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
    batchDownloadJSONFile({ url, note: result })
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
    if (obj && obj[url]) {
      console.log({ ...obj })
      // TODO 追加处理 或者 用数据库
      return
    }
    if (url && note) {
      await chrome.storage.local.set({ [url]: note })
      console.log('success')
    }
  }

  sendResponse({ message: '我是后台，已收到你的消息：', request })
})


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
  // .slice(0, 3)
  // if (Array.isArray(list) && list.length < 10) {
  //   const result = list
  //   const task = result
  //   // .filter(item => !allTabUrls.includes(item.url))
  //   .map(create)
  //   const response = await Promise.all(task)
  // }
  for (let index = 0, len = list.length; index < len; index++) {
    const item = list[index];
    const { id, noteCard } = item
    const { user } = noteCard
    const url = `https://www.xiaohongshu.com/user/profile/${user.userId}/${id}` // == `https://www.xiaohongshu.com/explore/${id}`
    const note = await chrome.storage.local.get(`https://www.xiaohongshu.com/explore/${id}`)
    if (note && note[url]) {
      console.log('已存在: ', note.url)
      continue
    }
    const tab = await create(url)
    console.log(tab)
    await sleep(5000)
    try {
      tab.id && await chrome.tabs.remove(tab.id)
    } catch (error) {
      console.log(error, tab)
    }
    await sleep(1000)
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
