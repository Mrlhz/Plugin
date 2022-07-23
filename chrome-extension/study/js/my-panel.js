import { getVideoDetailsHtml } from './dom.js'
import { executeScript, getCurrentTab, getSearchParams } from './helper.js'


document.getElementById('send_message').addEventListener('click', (e) => {
  chrome.runtime.sendMessage({ type: 'devtools', msg: '试着发送消息', url: location.href }, function (response) {
    console.log('收到来自后台的回复：', response)
  })
}, false);


document.getElementById('get_video_details').addEventListener('click', async (e) => {
  const currentTab = await getCurrentTab()
  const isVideoPage = /view_video|viewkey/i.test(currentTab.url)
  if (isVideoPage) {
    const [{ documentId, frameId, result }] = await executeScript(currentTab, getVideoDetailsHtml, [])
    const viewkey = getSearchParams(currentTab.url).get('viewkey')
    await updateVideoInfo(viewkey, result);
    chrome.runtime.sendMessage({ type: 'devtools', result, keys: chrome.devtools.inspectedWindow.tabId }, function (response) {
      console.log('收到来自后台的回复：', response)
    })
  }
}, false);

async function updateVideoInfo(viewkey, data = {}) {
  if (['author', 'title'].some(key => !data[key])) {
    return
  }
  const videoInfo = await chrome.storage.local.get([viewkey])
  const newInfo = { [viewkey]: Object.assign({}, videoInfo[viewkey], data) }
  await chrome.storage.local.set(newInfo)

}
