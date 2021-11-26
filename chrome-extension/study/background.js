

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

chrome.runtime.onInstalled.addListener(function () {
  chrome.contextMenus.create({
    'id': 'downloadAll',
    'type': 'normal',
    'title': 'download all',
  })
})


chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  console.log(info, tab)
  if (info.menuItemId == 'downloadVideo') {
    // chrome.scripting.executeScript({target: { tabId: tab.id }, func: getHtml }, onCall)
    // todo 应该先执行getHdLink， 再执行getHtml
    // chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getHtml, args: ['task'] }, onCall)
    const tab = await getCurrentTab()
    const h = await executeScript(tab, getHdLink)
    console.log(h, tab)
    await wait(1200)
    const res = await executeScript(tab, getHtml)
    console.log(res)
    await onDownload(res)
  } else if (info.menuItemId == 'newTabs') {
    // chrome.scripting.executeScript({ target: { tabId: tab.id }, func: getWellList, args: ['task'] }, onWellCall)
    const [{ frameId, result }] = await executeScript(tab, getWellList)
    console.log(result)
    const task = result.map(item => chrome.tabs.create({ url: item.href }))
    const response = await Promise.all(task)
    // const hd = await Promise.all(response.map(item => executeScript(item, getHdLink)))
    console.log(response)
  } else if (info.menuItemId === 'downloadAll') {
    const tabs = await getAllWindow()
    console.log('tabs', tabs)
    // filter
    const targetTabs = tabs.filter(tab => tab.url && tab.url.includes('view_video'))
    console.log(targetTabs)
    const tabTask = targetTabs.map(tab => executeScript(tab, getHdLink))
    await Promise.all(tabTask)
    await wait(1200)
    console.log('init')
    const downloadInfoTask = targetTabs.map(tab => executeScript(tab, getHtml))
    const downloadInfo = await Promise.all(downloadInfoTask)
    console.log('info', downloadInfo)
    const downloadTask = downloadInfo.map(item => onDownload(item))
    const res = await Promise.all(downloadTask)
  }
})

async function onDownload(results = []) {
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
  let queryOptions = { active: true, currentWindow: true }
  let [tab] = await chrome.tabs.query(queryOptions)
  return tab
}

async function getAllWindow() {
  let queryOptions = {}
  let tabs = await chrome.tabs.query(queryOptions)
  return tabs
}
// 图标和图形生成器
// https://zh-cn.cooltext.com/


function onTabUrlUpdated(tabId) {
  return new Promise((resolve, reject) => {
    const onUpdated = (id, info) => id === tabId && info.url && done(true)
    const onRemoved = id => id === tabId && done(false)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    function done(ok) {
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
      (ok ? resolve : reject)()
    }
  })
}