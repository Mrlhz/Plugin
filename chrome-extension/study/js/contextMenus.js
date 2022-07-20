/**
 * @description 创建右键菜单
 */

import { executeScript, getCurrentTab, getAllWindow, wait, pathParse, safeFileName, getSearchParams } from './helper.js'
import { getVideoDetailsHtml, getWellList, getHdLink, pages, setTitle, getAvatarList, getMovieDetail } from './dom.js'
import { getVideoBriefInfo } from './core/getVideoBriefInfo.js'
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
  // todo 应该先执行getHdLink， 再执行getVideoDetailsHtml
  const tab = await getCurrentTab()
  await executeScript(tab, getHdLink, [tab])
  await wait(1200)
  const res = await executeScript(tab, getVideoDetailsHtml)
  console.log(res)
  await onDownload(res)
}

async function downloadAllTabVideo({ allTabs }) {
  // filter
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('view_video'))
  console.log(targetTabs)
  const tabTask = targetTabs.map(tab => executeScript(tab, getHdLink))
  const result = await Promise.all(tabTask)
  // 获取hd的 数量
  const hdLength = result.filter(([{ documentId, frameId, result }]) => result).length
  console.log({ hdLength })
  let k = 0
  while(true) {
    const { length } = await getCurrentHdLinkLength()
    console.log({ length })
    k++
    if (length >= hdLength || k >= 120) {
      break
    }
    await wait(500) // 500毫秒轮询一次，判断页面是否load完成
  }
  await wait(1000)
  // todo 监听load事件
  console.log('init', k)
  const downloadInfoTask = targetTabs.map(tab => executeScript(tab, getVideoDetailsHtml))
  const downloadInfo = await Promise.all(downloadInfoTask)
  console.log('info', downloadInfo)
  const downloadTask = downloadInfo.map(item => onDownload(item))
  const res = await Promise.all(downloadTask)
}

async function getCurrentHdLinkLength() {
  const allTabs = await getAllWindow()
  const allTabUrls = allTabs.map(item => item.url)
  return allTabUrls.filter(url => url.includes('view_video_hd'))
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
    console.log('no file', result)
    return
  }
  let { downloadLink, title, time, author, url } = result
  title = await getTitle({ title, url }) // 确保能取到标题
  const res = await chrome.downloads.download({ url: downloadLink, filename: `91/[${author}]-${safeFileName(title)}-${time}.mp4` })
  console.log(res)
}

async function getTitle({ title, url }) {
  if (title) return title
  const viewkey = getSearchParams(url).get('viewkey')
  const storageTitle = await getStorageTitle(viewkey)
  return storageTitle
}

async function getStorageTitle(viewkey) {
  const storageItem = await chrome.storage.local.get([viewkey])
  const { title } = storageItem[viewkey] || {}
  return title || ''
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
  // todo 应该先执行getHdLink， 再执行getVideoDetailsHtml
  const allTabs = await getAllWindow()
  const targetTabs = allTabs.filter(tab => tab.url && tab.url.includes('viewthread.php'))

  const tabTask = targetTabs.map(tab => executeScript(tab, setTitle, [{}]))
  await Promise.all(tabTask)
  const [{ frameId, result }] = await executeScript(currentTab, pages)
  console.log(result)
  // await chrome.downloads.download({ url: result[0].url, filename: result[0].save})
}

async function downloadStarAvatarList({ currentTab }) {
  const [{ frameId, result = [] }] = await executeScript(currentTab, getAvatarList, [])
  console.log(result)
  const filePath = 'avatar'
  const tasks = result.map(item => {
    const { avatar, name } = item
    const { ext } = pathParse(avatar.url)
    const file = `${name}${ext}`
    const filename = `${filePath}/${file}`
    return chrome.downloads.download({ url: avatar.url, filename }).then(downloadId => {
      return { file, ...item, downloadId }
    })
  })
  const res = await Promise.all(tasks)
  console.log(res)
}


async function downloadMovieImageList({ currentTab }) {
  const [{ frameId, result = [] }] = await executeScript(currentTab, getMovieDetail, [])
  const { av, images } = result
  console.log(result)
  const filePath = 'avatar'
  const tasks = images.map(item => {
    const { name, url } = item
    const filename = images.length === 1 ? `${filePath}/${name}` : `${filePath}/${av}/${name}`
    return chrome.downloads.download({ url, filename }).then(downloadId => {
      return { av, ...item, downloadId }
    })
  })
  const res = await Promise.all(tasks)
  console.log(res)
}