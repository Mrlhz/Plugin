/**
 * @description 创建右键菜单
 */

import { executeScript, getCurrentTab, getAllWindow, wait } from './helper.js'
import { getHtml, getWellList, getHdLink, pages, setTitle } from './dom.js'

export default function menuInit() {
  const menus = [
    {
      'id': 'downloadVideo',
      'type': 'normal',
      'title': '下载视频',
    },
    {
      'id': 'newTabs',
      'type': 'normal',
      'title': '标签页',
    },
    {
      'id': 'downloadAll',
      'type': 'normal',
      'title': 'download all',
    },
    {
      'id': 'openView',
      'type': 'normal',
      'title': 'open view',
    },
    {
      'id': 'downloadPage',
      'type': 'normal',
      'title': 'adownload page',
    }
  ];
  menus.forEach(menu => {
    chrome.runtime.onInstalled.addListener(function () {
      chrome.contextMenus.create(menu)
    })
  })
}

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  const allTabs = await getAllWindow()
  const allTabUrls = allTabs.map(item => item.url)
  console.log(info, tab, allTabs, allTabUrls)
  if (info.menuItemId == 'downloadVideo') {
    await downloadVideo()
  } else if (info.menuItemId == 'newTabs') {
    await newTabs(tab, allTabUrls)
  } else if (info.menuItemId === 'downloadAll') {
    await downloadAllTabVideo({ allTabs })
  } else if (info.menuItemId === 'openView') {
    await create91PageTabs(tab, allTabUrls)
  } else if (info.menuItemId === 'downloadPage') {
    await downloadPage({ currentTab: tab })
  }
})

async function downloadVideo() {
  // todo 应该先执行getHdLink， 再执行getHtml
  const tab = await getCurrentTab()
  await executeScript(tab, getHdLink, [tab])
  await wait(1200)
  const res = await executeScript(tab, getHtml)
  console.log(res)
  await onDownload(res)
}

async function downloadAllTabVideo({ allTabs }) {
  // filter
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('view_video'))
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

async function newTabs(currentTab, allTabUrls) {
  const [{ frameId, result }] = await executeScript(currentTab, getWellList)
  console.log(result)
  const task = result
    .filter(item => !allTabUrls.includes(item.href)) // TODO href、url统一
    .map(item => chrome.tabs.create({ url: item.href }))
  const response = await Promise.all(task)
  // const hd = await Promise.all(response.map(item => executeScript(item, getHdLink)))
  console.log(response)
}

async function onDownload([ { result } ] = [{}]) {
  if (!result || !result.downloadLink) {
    console.log('no file')
    return
  }
  const { downloadLink, title, time, author } = result
  const res = await chrome.downloads.download({ url: downloadLink, filename: `91/[${author}]-${title}-${time}.mp4` })
  console.log(res)
}

async function create91PageTabs(currentTab, allTabUrls) {
  const [{ frameId, result }] = await executeScript(currentTab, pages)
  console.log(result)
  const task = result
    .filter(item => !allTabUrls.includes(item.url))
    .map(item => chrome.tabs.create({ url: item.url }))
  const response = await Promise.all(task)
  // const hd = await Promise.all(response.map(item => executeScript(item, getHdLink)))
  console.log(response)
}

async function downloadPage({ currentTab }) {
  // todo 应该先执行getHdLink， 再执行getHtml
  const allTabs = await getAllWindow()
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('viewthread.php'))

  const tabTask = targetTabs.map(tab => executeScript(tab, setTitle, [{}]))
  await Promise.all(tabTask)
  const [{ frameId, result }] = await executeScript(currentTab, pages)
  console.log(result)
  // await chrome.downloads.download({ url: result[0].url, filename: result[0].save})
}