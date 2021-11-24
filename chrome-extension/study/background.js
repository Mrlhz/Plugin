

import { cacheName, getHtml, getWellList, getHdLink } from './config.js'

console.log(cacheName)

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    'id': 'downloadVideo',
    'type': 'normal',
    'title': '下载视频',
  })
})

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    'id': 'newTabs',
    'type': 'normal',
    'title': '标签页',
  })
})


chrome.contextMenus.onClicked.addListener(function (info, tab) {
  console.log(info, tab)
  if (info.menuItemId == 'downloadVideo') {
    // chrome.scripting.executeScript({target: { tabId: tab.id }, func: getHtml }, onCall)
    // todo 应该先执行getHdLink， 再执行getHtml
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getHtml, args: ['task'] }, onCall)
  } else if (info.menuItemId == 'newTabs') {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getWellList, args: ['task'] }, onWellCall)
    
  }
})

async function onCall(results = []) {
  const tab = await getCurrentTab()
  await executeScript(tab, getHdLink)
  await wait(1200)
  console.log(results, tab)
  const _result = results[0]
  if (!_result || !_result.result.downloadLink) {
    console.log('no file', _result)
    return
  }
  const { result, frameId } = _result
  const { downloadLink, title, time, author } = result
  const res = await chrome.downloads.download({ url: downloadLink, filename: `91/[${author}]-${title}-${time}.mp4` })
  console.log(res)
}

function executeScript(tab, func) {
  return new Promise(resolve => {
    chrome.scripting.executeScript({ target: { tabId: tab.id }, func: func, args: ['task'] }, (...args) => {
      console.log('args')
      resolve(...args)
    })
  })
}

const wait = (delay) => new Promise(resolve => { setTimeout(resolve, delay) })

async function onWellCall([ { result } ] = []) {
  if (result && Array.isArray(result)) {
    result.forEach(item => {
      chrome.tabs.create({ url: item.href })
    })
  }
}


async function getCurrentTab() {
  let queryOptions = { active: true, currentWindow: true };
  let [tab] = await chrome.tabs.query(queryOptions);
  return tab;
}
// 图标和图形生成器
// https://zh-cn.cooltext.com/