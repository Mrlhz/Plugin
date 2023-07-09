import { getNoteDetail } from './js/dom.js'
import { setupOffscreenDocument, pathParse } from './js/utils.js'

const menu = {
  'id': 'downloadNoteImage',
  'type': 'normal',
  'title': 'download Note Image',
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create(menu)
})

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  console.log(info, tab)

  const [{ documentId, frameId, result }] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getNoteDetail, args: [] })
  console.log({ documentId, frameId, result })
  await setupOffscreenDocument()

  const response = await chrome.runtime.sendMessage({ cmd: 'background_to_offscreen', result })
  console.log('收到来自 offscreen 的回复：', response)
  // chrome.runtime.sendMessage({ cmd: 'background_to_offscreen', result }, function (response) {
  //   console.log('收到来自 offscreen 的回复：', response)
  // })
})


chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  console.log('消息：', request, sender, sendResponse)
  const { cmd, url, result } = request

  // download json file
  const { title, name } = result
  const filePath = `${name}/${title}`
  const filename = `${filePath}.json`
  if (cmd === 'offscreen_to_background') {
    chrome.downloads.download({ url: url, filename }).then(downloadId => {
      return { downloadId }
    })
    downloadImage(result)
  }
  if (cmd === 'content_script_to_background') {
    console.log('content-script: ', result)
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
