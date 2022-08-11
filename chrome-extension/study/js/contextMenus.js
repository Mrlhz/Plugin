/**
 * @description 创建右键菜单
 */

import { executeScript, getCurrentTab, getAllWindow, wait, pathParse, safeFileName, getSearchParams } from './helper.js'
import { getVideoDetailsHtml, getWellList, getHdLink, pages, setTitle } from './dom.js'
import { getVideoBriefInfo, merge } from './core/getVideoBriefInfo.js'
import { downloadMovieImageList, downloadStarAvatarList } from './core/downloadManage.js'
import strategy from './Strategy.js'

strategy.on(downloadVideo)
strategy.on('overrideDownloadVideo', downloadVideo)
strategy.on('downloadMovieImage', downloadMovieImageList)
strategy.on('downloadStarAvatar', downloadStarAvatarList)
strategy.on('videoBriefInfo', getVideoBriefInfo)
strategy.on('downloadAll', downloadAllTabVideo)

strategy.on('openView', create91PageTabs)
strategy.on(downloadPage)
strategy.on('newTabs', async ({ currentTab, allTabs }) => {
  await getVideoBriefInfo({ currentTab })
  await newTabs({ currentTab, allTabs })
})

const menus = [
  {
    'id': 'downloadVideo',
    'type': 'normal',
    'title': '下载视频',
  },
  {
    'id': 'overrideDownloadVideo',
    'type': 'normal',
    'title': '覆盖下载视频',
  },
  {
    'id': 'newTabs',
    'type': 'normal',
    'title': '标签页',
  },
  {
    'id': 'videoBriefInfo',
    'type': 'normal',
    'title': '视频简要信息',
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
    'title': 'download page',
  },
  {
    'id': 'downloadStarAvatar',
    'type': 'normal',
    'title': 'download Star Avatar',
  },
  {
    'id': 'downloadMovieImage',
    'type': 'normal',
    'title': 'download Movie Image',
  }
]

export default function menuInit() {
  menus.forEach(menu => {
    chrome.runtime.onInstalled.addListener(function () {
      chrome.contextMenus.create(menu)
    })
  })
}

chrome.contextMenus.onClicked.addListener(async function (info, tab) {
  const allTabs = await getAllWindow()
  const { menuItemId } = info
  console.log(info, tab, allTabs)
  const overwrite = menuItemId === 'overrideDownloadVideo'

  strategy.emit(menuItemId, { currentTab: tab, allTabs, overwrite })
})

async function downloadVideo(options = { overwrite: false }) {
  console.log(options)
  const tab = await getCurrentTab()
  await executeScript(tab, getHdLink, [tab])
  await waitForPageComplete([tab])
  const res = await executeScript(tab, getVideoDetailsHtml, [{ emit: 'download_video' }])
  const result = await onDownload(res, options)
  console.log(res, result)
}

async function downloadAllTabVideo({ allTabs }) {
  // filter
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('view_video'))
  console.log({ targetTabs })
  // TODO 监听load事件
  await waitForPageComplete(targetTabs)
  await wait(2000)
  const downloadInfoTask = targetTabs.map(tab => {
    return executeScript(tab, getVideoDetailsHtml, [{ emit: 'download_allTab_video' }])
  })
  const downloadInfo = await Promise.all(downloadInfoTask)
  console.log('info', downloadInfo)
  const downloadTask = downloadInfo.map(item => onDownload(item))
  const res = await Promise.all(downloadTask)
}

async function waitForPageComplete(targetTabs = []) {
  const ids = targetTabs.map(({ id }) => id)
  const tabTask = targetTabs.map(tab => executeScript(tab, getHdLink))
  const result = await Promise.all(tabTask)
  // 获取hd的 数量
  const hdLength = result.filter(([{ documentId, frameId, result }]) => result).length
  let k = 0 // 循环次数，超过120次，即最多60s停止，防止死循环
  while(true) {
    const latestTabs = await getAllWindow()
    const latestTargetTabs = latestTabs.filter(({ id }) => ids.includes(id))
    const { length } = await getCurrentHdLinkLength(latestTargetTabs)
    console.log({ length, hdLength })
    k++
    if (length >= hdLength || k >= 120) {
      break
    }
    await wait(500) // 500毫秒轮询一次，判断页面是否load完成
  }
  console.log('init', k)
}

async function getCurrentHdLinkLength(targetTabs = []) {
  const allTabUrls = targetTabs.map(item => item.url)
  return allTabUrls.filter(url => url.includes('view_video_hd'))
}

async function newTabs({ currentTab, allTabs }) {
  const allTabUrls = allTabs.map(item => item.url)
  const [{ frameId, result }] = await executeScript(currentTab, getWellList)
  console.log(result)
  const task = result
    .filter(item => !allTabUrls.includes(item.href))
    .map(item => chrome.tabs.create({ url: item.href }))
  const response = await Promise.all(task)
  console.log(response)
}

async function onDownload([ { result } ] = [{}], { overwrite = false } = {}) {
  if (!result || !result.downloadLink) {
    console.log('no file', result)
    return
  }
  let { downloadLink, title, time, author, url } = result
  const viewkey = getSearchParams(url).get('viewkey')
  const videoInfo = await getLocalStorage([viewkey]) // 确保能取到标题
  title = title ? title : videoInfo.title || ''
  author = author ? author : videoInfo.author || '匿名'
  if (!title || !author) {
    return Promise.resolve({ title, author })
  }
  const dir = `91/${safeFileName(author, '')}`
  const { name } = pathParse(downloadLink) // video 原名，用于判断文件重复
  const filename = `${dir}/[${author || ''}]-${safeFileName(title)}-${name}--${time}.mp4`
  // TODO 要重新下载的情形如何处理
  const downloaded = overwrite ? false : videoInfo.downloaded
  if (downloaded) {
    console.log(filename)
    return Promise.resolve({ ...result, msg: 'Downloaded' })
  }

  const res = await chrome.downloads.download({ url: downloadLink, filename })
  const videoStore = merge({ ...result, downloaded: true, original: name }, videoInfo)
  await chrome.storage.local.set({ [viewkey]: videoStore })
  console.log(res, { old: videoInfo, new: videoStore })
  return res
}

async function getLocalStorage(viewkey) {
  const storageItem = await chrome.storage.local.get(viewkey)
  return storageItem[viewkey] || {}
} 

async function create91PageTabs({ currentTab, allTabs }) {
  const allTabUrls = allTabs.map(item => item.url)
  const [{ frameId, result }] = await executeScript(currentTab, pages)
  console.log(result)
  const task = result
    .filter(item => !allTabUrls.includes(item.url))
    .map(item => chrome.tabs.create({ url: item.url }))
  const response = await Promise.all(task)
  console.log(response)
}

async function downloadPage({ currentTab }) {
  const allTabs = await getAllWindow()
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('viewthread.php'))

  const tabTask = targetTabs.map(tab => executeScript(tab, setTitle, [{}]))
  await Promise.all(tabTask)
  const [{ frameId, result }] = await executeScript(currentTab, pages)
  console.log(result)
  // await chrome.downloads.download({ url: result[0].url, filename: result[0].save})
}
