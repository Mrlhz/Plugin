import { getVideoDetailsHtml, getQuarkFiles } from './dom.js'
import { executeScript, getCurrentTab, getSearchParams, getAllWindow } from './helper.js'


document.getElementById('send_message').addEventListener('click', (e) => {
  chrome.runtime.sendMessage({ type: 'devtools', msg: '试着发送消息', url: location.href }, function (response) {
    console.log('收到来自后台的回复：', response)
  })
}, false);


document.getElementById('get_video_details').addEventListener('click', async (e) => {
  const currentTab = await getCurrentTab()
  const isVideoPage = /view_video|viewkey/i.test(currentTab.url)
  if (!isVideoPage) {
    return
  }
  const { result, viewkey } = await getVideoInfo(currentTab)
  // author、title有值才更新
  if (['author', 'title'].some(key => !result[key])) {
    return
  }
  await updateVideoInfo(viewkey, result);
  chrome.runtime.sendMessage({ type: 'devtools', result, keys: chrome.devtools.inspectedWindow.tabId }, function (response) {
    console.log('收到来自后台的回复：', response)
  })
}, false);

async function updateVideoInfo(viewkey, data = {}) {
  if (!viewkey) return
  const videoInfo = await chrome.storage.local.get(viewkey)
  const author = videoInfo.author ? videoInfo.author : data.author
  const newInfo = { ...videoInfo[viewkey], ...data, author }
  await chrome.storage.local.set({ [viewkey]: newInfo })
}

// 复制当前页面的`href`链接
document.getElementById('copy_current_tab_href').addEventListener('click', () => {
  chrome.devtools.inspectedWindow.eval('copy(decodeURIComponent(location.href))', () => {})
})

// 当前页签地址
document.getElementById('get_current_tab_link').addEventListener('click', async () => {
  const currentTab = await getCurrentTab()
  const { title, url } = currentTab
  const result = `- [${title}](${url})`
  chrome.devtools.inspectedWindow.eval(`copy(${JSON.stringify(result)})`, () => {})
})

// 复制所有页签的title、url，过滤掉chrome开头的页签
document.getElementById('get_tabs_links').addEventListener('click', async () => {
  const tabs = await getAllWindow()

  const result = tabs
    // ignore ['chrome://newtab/', 'chrome-extension://xxxx']
    .filter(({ url }) => !/chrome:|chrome-extension:/i.test(url))
    .map(({ title, url }) => `- [${title}](${url})`).join('\n');
  chrome.devtools.inspectedWindow.eval(`copy(${JSON.stringify(result)})`, () => {})

  chrome.runtime.sendMessage({ type: 'devtools', tabs, result }, function (response) {
    console.log('收到来自后台的回复：', response)
  })
})

document.getElementById('copy_quark_files').addEventListener('click', async () => {
  const currentTab = await getCurrentTab()
  const [{ documentId, frameId, result }] = await executeScript(currentTab, getQuarkFiles, ['复制夸克网盘文件列表'])
  chrome.devtools.inspectedWindow.eval(`copy(${JSON.stringify(result)})`, () => {})
})

document.getElementById('set_downloaded').addEventListener('click', async () => {
  const currentTab = await getCurrentTab()
  const { result = {}, viewkey, status } = await getVideoInfo(currentTab);
  await updateVideoInfo(viewkey, { ...result, downloaded: true });
})

document.getElementById('set_not_downloaded').addEventListener('click', async () => {
  const currentTab = await getCurrentTab()
  const { result, viewkey, status } = await getVideoInfo(currentTab);

  await updateVideoInfo(viewkey, { ...result, downloaded: false });
})

async function getVideoInfo(tab) {
  if (!tab || !tab.url) {
    return { status: 'fail', type: 'tab or tab.url get undefined' }
  }

  const isVideoPage = /view_video|viewkey/i.test(tab.url)
  if (!isVideoPage) {
    return { status: 'fail', type: 'not videoPage' }
  }

  const [{ documentId, frameId, result }] = await executeScript(tab, getVideoDetailsHtml, ['获取视频信息'])
  const viewkey = getSearchParams(tab.url).get('viewkey')

  return { status: 'success', result: result || {}, viewkey }
}
