/**
 * @description 创建右键菜单
 */

import { executeScript, getCurrentTab, getAllWindow, wait, pathParse, safeFileName, getSearchParams } from './helper.js'
import { getVideoDetailsHtml, getWellList, getHdLink, pages, setTitle } from './dom.js'
import { getVideoBriefInfo } from './core/getVideoBriefInfo.js'
import { downloadMovieImageList, downloadStarAvatarList } from './core/downloadManage.js'

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
  const allTabUrls = allTabs.map(item => item.url)
  const { menuItemId } = info
  console.log(info, tab, allTabs, allTabUrls)
  if (info.menuItemId == 'downloadVideo') {
    await downloadVideo()
  } else if (info.menuItemId == 'newTabs') {
    await getVideoBriefInfo(tab)
    await newTabs(tab, allTabUrls)
  } else if (menuItemId === 'videoBriefInfo') {
    await getVideoBriefInfo(tab)
  } else if (info.menuItemId === 'downloadAll') {
    await downloadAllTabVideo({ allTabs })
  } else if (info.menuItemId === 'openView') {
    await create91PageTabs(tab, allTabUrls)
  } else if (info.menuItemId === 'downloadPage') {
    await downloadPage({ currentTab: tab })
  } else if (info.menuItemId === 'downloadStarAvatar'){
    await downloadStarAvatarList({ currentTab: tab })
  } else if (info.menuItemId === 'downloadMovieImage'){
    await downloadMovieImageList({ currentTab: tab })
  }
})

async function downloadVideo() {
  const tab = await getCurrentTab()
  await executeScript(tab, getHdLink, [tab])
  await waitForPageComplete([tab])
  const res = await executeScript(tab, getVideoDetailsHtml, [{ emit: 'download_video' }])
  const result = await onDownload(res)
  console.log(res, result)
}

async function downloadAllTabVideo({ allTabs }) {
  // filter
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('view_video'))
  console.log({ targetTabs })
  // todo 监听load事件
  await waitForPageComplete(targetTabs)
  await wait(1000)
  const downloadInfoTask = targetTabs.map(tab => {
    return executeScript(tab, getVideoDetailsHtml, [{ emit: 'download_allTab_video' }])
  })
  const downloadInfo = await Promise.all(downloadInfoTask)
  console.log('info', downloadInfo)
  const downloadTask = downloadInfo.map(item => onDownload(item))
  const res = await Promise.all(downloadTask)
}

async function waitForPageComplete(targetTabs) {
  const ids = targetTabs.map(({ id }) => id)
  const tabTask = targetTabs.map(tab => executeScript(tab, getHdLink))
  const result = await Promise.all(tabTask)
  // 获取hd的 数量
  const hdLength = result.filter(([{ documentId, frameId, result }]) => result).length
  let k = 0
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

async function newTabs(currentTab, allTabUrls) {
  const [{ frameId, result }] = await executeScript(currentTab, getWellList)
  console.log(result)
  const task = result
    .filter(item => !allTabUrls.includes(item.href)) // TODO href、url统一
    .map(item => chrome.tabs.create({ url: item.href }))
  const response = await Promise.all(task)
  console.log(response)
}

async function onDownload([ { result } ] = [{}]) {
  if (!result || !result.downloadLink) {
    console.log('no file', result)
    return
  }
  let { downloadLink, title, time, author, url } = result
  const { name } = pathParse(downloadLink) // video 原名，用于判断文件重复
  const viewkey = getSearchParams(url).get('viewkey')
  const info = await getStorageInfo({ url }) // 确保能取到标题
  title = title ? title : info.title || ''
  author = author ? author : info.author || ''
  if (!title || !author) {
    return Promise.resolve(0)
  }
  const videoInfoObj = await chrome.storage.local.get([viewkey])
  const videoInfo = videoInfoObj[viewkey] || {}
  // TODO 要重新下载的情形如何处理
  if (videoInfo.downloaded) {
    return Promise.resolve('Downloaded')
  }

  const res = await chrome.downloads.download({ url: downloadLink, filename: `91/[${author || ''}]-${safeFileName(title)}-${name}--${time}.mp4` })
  await chrome.storage.local.set({ [viewkey]: Object.assign({}, videoInfo, { downloaded: true }) })
  console.log(res, { videoInfoObj })
  return res
}

async function getStorageInfo({ url }) {
  const viewkey = getSearchParams(url).get('viewkey')
  const storageItem = await chrome.storage.local.get([viewkey])
  return storageItem[viewkey] || {}
} 

async function create91PageTabs(currentTab, allTabUrls) {
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
